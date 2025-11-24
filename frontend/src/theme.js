import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    background: {
      default: "#9dd79dff",    // Tea green background
      paper: "#fee0edff"       // Toasted wheat card background
    },
    primary: {
      main: "#478778"        // Deep forest green (buttons / accents)
    },
    secondary: {
      main: "#9F2B68"        // Blush blossom
    },
    text: {
      primary: "#478778",
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
        }
      }
    }
  }
});

export default theme;
