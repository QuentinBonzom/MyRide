import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      {/* Footer is rendered only on desktop using hidden md:block */}
      <div className="hidden">
        
      </div>
    </>
  );
}

export default MyApp;
