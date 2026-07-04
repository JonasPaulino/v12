import React, { useMemo } from "react";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import * as S from "./style";

const buildPageItems = (page, totalPages) => {
  const safeTotal = Math.max(1, Number(totalPages || 1));
  const safePage = Math.min(Math.max(1, Number(page || 1)), safeTotal);

  if (safeTotal <= 3) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }

  if (safePage <= 1) return [1, 2, 3];
  if (safePage >= safeTotal) return [safeTotal - 2, safeTotal - 1, safeTotal];

  return [safePage - 1, safePage, safePage + 1];
};

export default function Paginacao({
  page = 1,
  totalPages = 1,
  onPageChange,
  className,
}) {
  const safeTotalPages = Math.max(1, Number(totalPages || 1));
  const safePage = Math.min(Math.max(1, Number(page || 1)), safeTotalPages);
  const pageItems = useMemo(
    () => buildPageItems(safePage, safeTotalPages),
    [safePage, safeTotalPages]
  );

  const goToPage = (nextPage) => {
    const normalized = Math.min(Math.max(1, Number(nextPage || 1)), safeTotalPages);
    if (normalized === safePage) return;
    onPageChange?.(normalized);
  };

  return (
    <S.Pagination className={className} aria-label="Paginação">
      <S.NavButton
        type="button"
        onClick={() => goToPage(safePage - 1)}
        disabled={safePage <= 1}
        aria-label="Página anterior"
        title="Anterior"
      >
        <S.IconWrap>
          <BsChevronLeft />
        </S.IconWrap>
        <S.HoverLabel>Anterior</S.HoverLabel>
      </S.NavButton>

      <S.PageGroup>
        {pageItems.map((item) => (
          <S.PageButton
            key={item}
            type="button"
            $active={item === safePage}
            onClick={() => goToPage(item)}
            aria-current={item === safePage ? "page" : undefined}
          >
            {item}
          </S.PageButton>
        ))}
      </S.PageGroup>

      <S.NavButton
        type="button"
        onClick={() => goToPage(safePage + 1)}
        disabled={safePage >= safeTotalPages}
        aria-label="Próxima página"
        title="Próxima"
      >
        <S.HoverLabel>Próxima</S.HoverLabel>
        <S.IconWrap>
          <BsChevronRight />
        </S.IconWrap>
      </S.NavButton>
    </S.Pagination>
  );
}
