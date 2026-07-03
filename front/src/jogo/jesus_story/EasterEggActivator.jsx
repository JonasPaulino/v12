import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as C from "./JesusStoryEasterEgg.styles";

const SECRET_SEQUENCE = "jesus";

export const EasterEggActivator = () => {
  const navigate = useNavigate();
  const typedRef = useRef("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const tagName = String(target?.tagName || "").toLowerCase();

      if (target?.isContentEditable || ["input", "textarea", "select"].includes(tagName)) {
        return;
      }

      const key = String(event.key || "").toLowerCase();
      if (key.length !== 1 || !/[a-z]/.test(key)) return;

      typedRef.current = `${typedRef.current}${key}`.slice(-SECRET_SEQUENCE.length);

      if (typedRef.current === SECRET_SEQUENCE) {
        typedRef.current = "";
        navigate("/easter-egg/jesus");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <C.SecretPixel
      type="button"
      aria-label="Easter egg"
      title=""
      onClick={() => navigate("/easter-egg/jesus")}
    />
  );
};
