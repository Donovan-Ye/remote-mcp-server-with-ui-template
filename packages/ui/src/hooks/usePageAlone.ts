import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Whether the page is being used standalone
 * Not standalone means being embedded in the chat interface. The logic differs depending on whether it's embedded or standalone. 
 * For example, when embedded, communication is done via postMessage to the parent iframe; when standalone, it communicates directly with the API.
 */
const usePageAlone = () => {
  const [query] = useSearchParams();
  const [pageAlone, setPageAlone] = useState(false);

  useEffect(() => {
    setPageAlone(query.get('alone') === 'true');
  }, [query]);

  return { pageAlone };
};

export default usePageAlone;
