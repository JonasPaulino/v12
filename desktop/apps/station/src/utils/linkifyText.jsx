import React from "react";

const URL_REGEX =
  /((?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<]*)?)/gi;

function trimTrailingPunctuation(value) {
  const match = String(value || "").match(/^(.+?)([.,;:!?)]*)$/);
  return {
    url: match?.[1] || value,
    trailing: match?.[2] || "",
  };
}

function buildHref(value) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function linkifyText(text = "") {
  const value = String(text || "");
  const parts = [];
  let lastIndex = 0;

  value.replace(URL_REGEX, (match, _url, offset) => {
    if (offset > lastIndex) {
      parts.push(value.slice(lastIndex, offset));
    }

    const { url, trailing } = trimTrailingPunctuation(match);
    parts.push(
      <a key={`${offset}-${url}`} href={buildHref(url)} target="_blank" rel="noreferrer">
        {url}
      </a>,
    );

    if (trailing) {
      parts.push(trailing);
    }

    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex));
  }

  return parts.length ? parts : value;
}
