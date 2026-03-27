import React from "react";
import "../src/styles.css";

export default function App({ Component, pageProps }) {
  // Use React.createElement to avoid relying on the JSX dev/runtime helper
  return React.createElement(Component, pageProps);
}
