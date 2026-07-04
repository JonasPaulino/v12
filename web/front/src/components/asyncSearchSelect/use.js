import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";

const sameOption = (left, right, getOptionValue) => {
  if (!left || !right) return false;
  return String(getOptionValue(left)) === String(getOptionValue(right));
};

export const useAsyncSearchSelect = ({
  selectedOption,
  loadOptions,
  getOptionValue,
  minChars,
}) => {
  const containerRef = useRef(null);
  const loadOptionsRef = useRef(loadOptions);
  const getOptionValueRef = useRef(getOptionValue);
  const selectedOptionRef = useRef(selectedOption || null);
  const hasLoadedInitialRef = useRef(false);
  const lastRequestedTermRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const normalizedSelected = useMemo(() => selectedOption || null, [selectedOption]);

  useEffect(() => {
    loadOptionsRef.current = loadOptions;
  }, [loadOptions]);

  useEffect(() => {
    getOptionValueRef.current = getOptionValue;
  }, [getOptionValue]);

  useEffect(() => {
    selectedOptionRef.current = normalizedSelected;
  }, [normalizedSelected]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const term = debouncedSearch.trim();
    const shouldLoadInitialPreview = minChars === 0 && term === "" && !hasLoadedInitialRef.current;
    const shouldSearchByTyping = term.length >= minChars && term !== "";

    if (!shouldLoadInitialPreview && !shouldSearchByTyping) {
      if (!options.length && normalizedSelected) {
        setOptions([normalizedSelected]);
      }
      setLoading(false);
      return undefined;
    }

    const requestKey = shouldLoadInitialPreview ? "__initial__" : term;
    if (lastRequestedTermRef.current === requestKey) {
      return undefined;
    }

    lastRequestedTermRef.current = requestKey;

    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        const result = await loadOptionsRef.current(term);
        if (!active) return;

        const nextOptions = Array.isArray(result) ? result : [];
        const currentSelected = selectedOptionRef.current;
        if (
          currentSelected &&
          !nextOptions.some((option) =>
            sameOption(option, currentSelected, getOptionValueRef.current)
          )
        ) {
          setOptions([currentSelected, ...nextOptions]);
          hasLoadedInitialRef.current = true;
          return;
        }

        setOptions(nextOptions);
        hasLoadedInitialRef.current = true;
      } catch {
        if (active) {
          setOptions(selectedOptionRef.current ? [selectedOptionRef.current] : []);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [debouncedSearch, isOpen, minChars, normalizedSelected, options.length]);

  const open = () => {
    setIsOpen(true);
    setSearch("");
  };

  const close = () => {
    setIsOpen(false);
    setSearch("");
  };

  return {
    containerRef,
    isOpen,
    search,
    setSearch,
    options,
    loading,
    open,
    close,
  };
};
