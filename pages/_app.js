// pages/_app.js
import { ChakraProvider } from "@chakra-ui/react";
import Navbar from "../Components/Navbar";

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider>
      <Navbar />
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default MyApp;
