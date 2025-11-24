"use strict";

/********* External Imports ********/
const { stringToBuffer, bufferToString, encodeBuffer, decodeBuffer, getRandomBytes } = require("./lib");
const { subtle } = require('crypto').webcrypto;

/********* Constants ********/
const PBKDF2_ITERATIONS = 100000; // number of iterations for PBKDF2 algorithm
const MAX_PASSWORD_LENGTH = 64;   // we can assume no password is longer than this many characters
const SALT_LENGTH = 16;           // 128-bit salt
const AES_IV_LENGTH = 12;         // 96-bit IV for AES-GCM

/********* Helpers ********/
async function pbkdf2(password, salt, iterations = PBKDF2_ITERATIONS) {
  // Import password as a PBKDF2 key
  const pwKey = await subtle.importKey(
    "raw",
    stringToBuffer(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  // Derive 256 bits
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
    pwKey,
    256
  );
  return new Uint8Array(bits);
}

function padPasswordToFixed(buf) {
  // buf is Uint8Array of password bytes, return Uint8Array length MAX_PASSWORD_LENGTH
  const out = new Uint8Array(MAX_PASSWORD_LENGTH);
  out.fill(0);
  out.set(buf.slice(0, MAX_PASSWORD_LENGTH));
  return out;
}

function unpadPasswordBuf(buf) {
  // remove trailing zero bytes (nulls)
  let end = buf.length;
  while (end > 0 && buf[end - 1] === 0) end--;
  return buf.slice(0, end);
}

async function sha256Bytes(buf) {
  const h = await subtle.digest("SHA-256", buf);
  return new Uint8Array(h);
}

/********* Implementation ********/
class Keychain {
  constructor({ saltB64, kvs = {}, checkB64, secrets = {} } = {}) {
    // public data
    this.data = {
      salt: saltB64 || undefined,    // base64 salt (clear)
      kvs: kvs                       // map: base64(hmac(domain)) -> { iv: base64, ct: base64 }
    };

    // private in-memory secrets (CryptoKey objects)
    this.secrets = {
      masterHmacCryptoKey: secrets.masterHmacCryptoKey || null, // used only to derive subkeys & check
      domainHmacCryptoKey: secrets.domainHmacCryptoKey || null, // used to compute HMAC(domain) for lookup/AAD
      aesCryptoKey: secrets.aesCryptoKey || null                // AES-GCM CryptoKey for encrypt/decrypt
    };

    // stored HMAC-of-master "check" value (base64) used to verify password correctness on load
    this._check = checkB64 || undefined;
  };

  /**************** static init ****************/
  static async init(password) {
    // 1) generate salt
    const salt = getRandomBytes(SALT_LENGTH); // Uint8Array
    const saltB64 = encodeBuffer(salt);

    // 2) derive master key bytes via PBKDF2 (one call)
    const masterKeyBytes = await pbkdf2(password, salt, PBKDF2_ITERATIONS);

    // 3) import master key as an HMAC key to act as PRF to produce subkeys
    const masterHmacCryptoKey = await subtle.importKey(
      "raw",
      masterKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // 4) derive domain HMAC key material and AES key material by evaluating HMAC(master, label)
    const domainLabel = stringToBuffer("domain-key-derive");
    const aesLabel = stringToBuffer("aes-key-derive");
    const checkLabel = stringToBuffer("master-check");

    const domainKeyBytes = new Uint8Array(await subtle.sign("HMAC", masterHmacCryptoKey, domainLabel));
    const aesKeyBytes = new Uint8Array(await subtle.sign("HMAC", masterHmacCryptoKey, aesLabel));
    const checkBytes = new Uint8Array(await subtle.sign("HMAC", masterHmacCryptoKey, checkLabel));

    // 5) import the derived keys into CryptoKey objects
    const domainHmacCryptoKey = await subtle.importKey(
      "raw",
      domainKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const aesCryptoKey = await subtle.importKey(
      "raw",
      aesKeyBytes,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );

    // 6) create the Keychain instance
    const k = new Keychain({
      saltB64,
      kvs: {},
      checkB64: encodeBuffer(checkBytes),
      secrets: { masterHmacCryptoKey, domainHmacCryptoKey, aesCryptoKey }
    });

    return k;
  }

  /**************** static load ****************/
  static async load(password, repr, trustedDataCheck) {
    // repr is a JSON string produced by dump()
    const parsed = JSON.parse(repr);

    // If trusted checksum provided, verify it first
    if (trustedDataCheck !== undefined) {
      // compute SHA-256 over repr string (exact serialization)
      const computedHash = await sha256Bytes(stringToBuffer(repr));
      const computedB64 = encodeBuffer(computedHash);
      if (computedB64 !== trustedDataCheck) {
        throw "Trusted data check failed: checksum mismatch (possible tampering)";
      }
    }

    // Get salt (must exist in serialized repr)
    if (!parsed.salt) throw "Invalid representation: salt missing";

    const salt = decodeBuffer(parsed.salt);

    // Derive masterKey bytes using PBKDF2 (single call)
    const masterKeyBytes = await pbkdf2(password, salt, PBKDF2_ITERATIONS);

    // Import master as HMAC key
    const masterHmacCryptoKey = await subtle.importKey(
      "raw",
      masterKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // compute check value and compare to stored check (if there is stored check in parsed)
    if (!parsed.check) {
      throw "Representation missing master check field";
    }
    const checkLabel = stringToBuffer("master-check");
    const computedCheckBytes = new Uint8Array(await subtle.sign("HMAC", masterHmacCryptoKey, checkLabel));
    const computedCheckB64 = encodeBuffer(computedCheckBytes);
    if (computedCheckB64 !== parsed.check) {
      throw "Password invalid or representation tampered: master check failed";
    }

    // derive domain and aes key bytes
    const domainKeyBytes = new Uint8Array(await subtle.sign("HMAC", masterHmacCryptoKey, stringToBuffer("domain-key-derive")));
    const aesKeyBytes = new Uint8Array(await subtle.sign("HMAC", masterHmacCryptoKey, stringToBuffer("aes-key-derive")));

    // import derived keys
    const domainHmacCryptoKey = await subtle.importKey(
      "raw",
      domainKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const aesCryptoKey = await subtle.importKey(
      "raw",
      aesKeyBytes,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );

    // create the Keychain instance with parsed kvs
    const k = new Keychain({
      saltB64: parsed.salt,
      kvs: parsed.kvs || {},
      checkB64: parsed.check,
      secrets: { masterHmacCryptoKey, domainHmacCryptoKey, aesCryptoKey }
    });

    return k;
  }

  /**************** dump ****************/
  async dump() {
    // returns [jsonString, sha256(jsonString) as base64]

    // create a serializable object containing salt, kvs, and check
    const obj = {
      salt: this.data.salt,
      kvs: this.data.kvs,
      check: this._check
    };

    const json = JSON.stringify(obj);
    const digest = await sha256Bytes(stringToBuffer(json));
    const digestB64 = encodeBuffer(digest);
    return [json, digestB64];
  }

  /**************** internal: compute HMAC(domain) and key ****************/
  async _domainHmacBytes(domain) {
    // compute HMAC(domain) using domainHmacCryptoKey -> Uint8Array
    if (!this.secrets.domainHmacCryptoKey) throw "Keychain not initialized for HMAC operations";
    const sig = await subtle.sign("HMAC", this.secrets.domainHmacCryptoKey, stringToBuffer(domain));
    return new Uint8Array(sig);
  }

  async _kvsKeyForDomain(domain) {
    const h = await this._domainHmacBytes(domain);
    return encodeBuffer(h);
  }

  /**************** set ****************/
  async set(name, value) {
    // name: domain string
    // value: password string
    if (typeof name !== "string" || typeof value !== "string") throw "Invalid arguments";

    // 1) compute kvs key
    const kvsKey = await this._kvsKeyForDomain(name);

    // 2) pad password to MAX_PASSWORD_LENGTH
    const pwBuf = padPasswordToFixed(new Uint8Array(stringToBuffer(value)));

    // 3) compute associated data = HMAC(domain)
    const aad = await this._domainHmacBytes(name);

    // 4) generate random IV
    const iv = getRandomBytes(AES_IV_LENGTH);

    // 5) encrypt using AES-GCM with aad as additionalData
    const ciphertextBuf = await subtle.encrypt(
      { name: "AES-GCM", iv: iv, additionalData: aad, tagLength: 128 },
      this.secrets.aesCryptoKey,
      pwBuf
    );

    // store base64 encoded iv and ciphertext
    this.data.kvs[kvsKey] = {
      iv: encodeBuffer(iv),
      ct: encodeBuffer(new Uint8Array(ciphertextBuf))
    };

    return; // void
  }

  /**************** get ****************/
  async get(name) {
    if (typeof name !== "string") throw "Invalid argument";

    const kvsKey = await this._kvsKeyForDomain(name);
    const entry = this.data.kvs[kvsKey];
    if (!entry) return null;

    const iv = decodeBuffer(entry.iv);
    const ct = decodeBuffer(entry.ct);

    const aad = await this._domainHmacBytes(name);

    // attempt decrypt; subtle.decrypt will throw if auth fails
    let plainBuf;
    try {
      const decrypted = await subtle.decrypt(
        { name: "AES-GCM", iv: iv, additionalData: aad, tagLength: 128 },
        this.secrets.aesCryptoKey,
        ct
      );
      plainBuf = new Uint8Array(decrypted);
    } catch (e) {
      // authentication failed -> tampering or wrong keys
      throw "Decryption failed (tampering or wrong password)";
    }

    const unpadded = unpadPasswordBuf(plainBuf);
    return bufferToString(unpadded);
  }

  /**************** remove ****************/
  async remove(name) {
    if (typeof name !== "string") throw "Invalid argument";

    const kvsKey = await this._kvsKeyForDomain(name);
    if (this.data.kvs[kvsKey] === undefined) return false;
    delete this.data.kvs[kvsKey];
    return true;
  };
};

module.exports = { Keychain };
