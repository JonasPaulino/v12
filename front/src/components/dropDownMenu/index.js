import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlineEllipsisHorizontalCircle,
  HiOutlineEye,
  HiOutlinePaperAirplane,
  HiOutlinePencilSquare,
  HiOutlinePrinter,
  HiOutlineTrash,
  HiOutlineXCircle,
} from "react-icons/hi2";
import * as S from "./style";

const getLabelText = (item) =>
  String(
    typeof item.label === "string" ? item.label : item.ariaLabel || item.title || ""
  ).toLowerCase();

const getDefaultIcon = (item) => {
  const label = getLabelText(item);
  if (label.includes("editar")) return <HiOutlinePencilSquare />;
  if (label.includes("remover") || label.includes("excluir")) return <HiOutlineTrash />;
  if (label.includes("reativar") || label.includes("confirmar") || label.includes("desbloquear")) {
    return <HiOutlineCheckCircle />;
  }
  if (label.includes("cancelar") || label.includes("inativar") || label.includes("bloquear")) {
    return <HiOutlineXCircle />;
  }
  if (label.includes("consultar") || label.includes("atualizar") || label.includes("status")) return <HiOutlineArrowPath />;
  if (label.includes("visualizar") || label.includes("detalhe") || label.includes("abrir")) return <HiOutlineEye />;
  if (label.includes("imprimir") || label.includes("danfe")) return <HiOutlinePrinter />;
  if (label.includes("enviar") || label.includes("whatsapp")) return <HiOutlinePaperAirplane />;
  if (label.includes("baixar") || label.includes("download")) return <HiOutlineArrowDownTray />;
  if (label.includes("xml") || label.includes("nota") || label.includes("nf-e")) return <HiOutlineDocumentText />;
  return <HiOutlineEllipsisHorizontalCircle />;
};

export default function DropdownMenu({
  open,
  anchorEl,
  onClose,
  items = [],
  align = "end",
  minWidth = 140,
  offset = 6,
  zIndex = 999999,
  closeOnScroll = true,
  strategy = "fixed",
}) {
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: -10000, left: -10000 });
  const [measuring, setMeasuring] = useState(true);
  const shouldRender = open && !!anchorEl;
  const body = typeof document !== "undefined" ? document.body : null;

  useLayoutEffect(() => {
    if (!shouldRender) return;
    setMeasuring(true);
    setCoords({ top: -10000, left: -10000 });
  }, [shouldRender]);

  useLayoutEffect(() => {
    if (!shouldRender || !menuRef.current || !anchorEl) return;

    const menuRect = menuRef.current.getBoundingClientRect();
    const rect = anchorEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = align === "start" ? rect.left : rect.right - menuRect.width;
    left = Math.max(8, Math.min(left, vw - 8 - menuRect.width));

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    let top =
      spaceBelow < menuRect.height + 8 && spaceAbove > spaceBelow
        ? rect.top - offset - menuRect.height
        : rect.bottom + offset;

    if (strategy === "absolute") {
      left += window.pageXOffset || document.documentElement.scrollLeft || 0;
      top += window.pageYOffset || document.documentElement.scrollTop || 0;
    }

    if (top + menuRect.height > vh - 4) {
      top = vh - menuRect.height - 4;
    }

    if (top < 4) top = 4;

    setCoords({ top, left });
    setMeasuring(false);
  }, [shouldRender, anchorEl, align, offset, strategy]);

  useEffect(() => {
    if (!shouldRender) return;

    const onKey = (event) => event.key === "Escape" && onClose?.();
    const onResize = () => onClose?.();
    const onScroll = () => closeOnScroll && onClose?.();

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    if (closeOnScroll) {
      document.addEventListener("scroll", onScroll, true);
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      if (closeOnScroll) {
        document.removeEventListener("scroll", onScroll, true);
      }
    };
  }, [shouldRender, onClose, closeOnScroll]);

  if (!body || !shouldRender) return null;

  return createPortal(
    <>
      <S.ClickAway $zIndex={zIndex} onClick={onClose} />
      <S.Menu
        ref={menuRef}
        className={measuring ? "measuring" : "open"}
        style={{ top: coords.top, left: coords.left }}
        $minWidth={minWidth}
        $zIndex={zIndex}
        $strategy={strategy}
        role="menu"
      >
        {items.map((item, index) => {
          const icon = item.icon || getDefaultIcon(item);
          const ariaLabel =
            item.ariaLabel ||
            (typeof item.label === "string" ? item.label : item.title || "Opção do menu");

          return item.isDivider ? (
            <S.Divider key={item.key ?? `div-${index}`} />
          ) : (
            <S.Item
              key={item.key ?? index}
              type="button"
              onClick={() => {
                if (item.disabled) return;
                item.onClick?.();
                onClose?.();
              }}
              $danger={!!item.danger}
              disabled={!!item.disabled}
              title={item.title || ""}
              aria-label={ariaLabel}
              role="menuitem"
            >
              <S.ItemIcon $danger={!!item.danger}>{icon}</S.ItemIcon>
              <S.ItemLabel>{item.label}</S.ItemLabel>
            </S.Item>
          );
        })}
      </S.Menu>
    </>,
    body
  );
}
