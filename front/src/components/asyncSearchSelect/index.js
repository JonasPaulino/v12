import React from "react";
import { useAsyncSearchSelect } from "./use";
import * as C from "./style";

const defaultGetOptionValue = (option) => option?.value;
const defaultGetOptionLabel = (option) => option?.label || "";

const AsyncSearchSelect = ({
  value,
  selectedOption,
  onSelect,
  loadOptions,
  inputRef,
  placeholder = "Selecione",
  searchPlaceholder = "Digite para pesquisar",
  emptyMessage = "Nenhum registro encontrado.",
  minChars = 0,
  disabled = false,
  getOptionValue = defaultGetOptionValue,
  getOptionLabel = defaultGetOptionLabel,
  getOptionMeta,
  getOptionDisabled,
  onDisabledSelect,
}) => {
  const {
    containerRef,
    isOpen,
    search,
    setSearch,
    options,
    loading,
    open,
    close,
  } = useAsyncSearchSelect({
    selectedOption,
    loadOptions,
    getOptionValue,
    minChars,
  });

  const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : "";
  const shouldShowDropdown = isOpen && !disabled;

  return (
    <C.Wrapper ref={containerRef}>
      <C.Input
        ref={inputRef}
        value={isOpen ? search : selectedLabel}
        placeholder={isOpen ? selectedLabel || searchPlaceholder : placeholder}
        onFocus={open}
        onClick={open}
        onChange={(event) => setSearch(event.target.value)}
        disabled={disabled}
      />

      {shouldShowDropdown && (
        <C.Dropdown>
          {loading ? (
            <C.Status>Pesquisando...</C.Status>
          ) : (
            <C.Options>
              {!options.length ? (
                <C.Status>
                  {search.trim().length < minChars
                    ? `Digite pelo menos ${minChars} caractere(s).`
                    : emptyMessage}
                </C.Status>
              ) : (
                options.map((option) => {
                  const optionValue = getOptionValue(option);
                  const optionDisabled = !!getOptionDisabled?.(option);
                  return (
                    <C.OptionButton
                      key={optionValue}
                      type="button"
                      $active={String(optionValue) === String(value || "")}
                      $disabled={optionDisabled}
                      onClick={() => {
                        if (optionDisabled) {
                          onDisabledSelect?.(option);
                          return;
                        }
                        onSelect(optionValue, option);
                        close();
                      }}
                    >
                      <C.OptionLabel>{getOptionLabel(option)}</C.OptionLabel>
                      {getOptionMeta ? (
                        <C.OptionMeta>{getOptionMeta(option)}</C.OptionMeta>
                      ) : null}
                    </C.OptionButton>
                  );
                })
              )}
            </C.Options>
          )}
        </C.Dropdown>
      )}
    </C.Wrapper>
  );
};

export default AsyncSearchSelect;
