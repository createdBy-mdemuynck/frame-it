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
        <title>Fotowedstrijd TransformArt</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Upload jouw foto en maak kans op mooie prijzen!" />
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
