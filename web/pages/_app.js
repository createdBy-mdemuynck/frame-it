import React from "react";
import "../src/styles.css";
import Head from "next/head";

export default function App({ Component, pageProps }) {
  // Inject runtime environment variables for client-side access
  const runtimeConfig = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  };

  return (
    <>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__ = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
