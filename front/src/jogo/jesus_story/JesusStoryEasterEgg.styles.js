import styled, { keyframes } from "styled-components";

const scrollWorld = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-9px);
  }
`;

const glow = keyframes`
  0%, 100% {
    opacity: 0.28;
    transform: scale(0.94);
  }
  50% {
    opacity: 0.58;
    transform: scale(1.04);
  }
`;

const rise = keyframes`
  from {
    transform: translateY(18px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

export const Page = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.92), transparent 24rem),
    linear-gradient(180deg, #f9fafb 0%, #f0f2f5 52%, #ffffff 100%);
  color: #1f2933;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
`;

export const Shell = styled.section`
  width: min(1120px, 100%);
  min-height: min(720px, calc(100vh - 44px));
  border: 2px solid #1f2933;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.16);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const TopBar = styled.header`
  min-height: 72px;
  padding: 16px 20px;
  border-bottom: 2px solid #1f2933;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: #ffffff;

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const Eyebrow = styled.span`
  display: block;
  color: #667085;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

export const Title = styled.h1`
  margin: 3px 0 0;
  color: #111827;
  font-size: clamp(1.28rem, 2.4vw, 2rem);
  line-height: 1.1;
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

export const Button = styled.button`
  min-height: 40px;
  padding: 0 14px;
  border: 2px solid #1f2933;
  border-radius: 999px;
  background: ${({ $dark }) => ($dark ? "#1f2933" : "#ffffff")};
  color: ${({ $dark }) => ($dark ? "#ffffff" : "#1f2933")};
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
  }
`;

export const Stage = styled.div`
  position: relative;
  flex: 1;
  min-height: 520px;
  overflow: hidden;
  background:
    linear-gradient(180deg, transparent 0 74%, #e8ebef 74% 75%, #ffffff 75% 100%),
    repeating-linear-gradient(90deg, rgba(31, 41, 51, 0.04) 0 1px, transparent 1px 56px);

  @media (max-width: 720px) {
    min-height: 620px;
  }
`;

export const Sky = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
`;

export const Cloud = styled.div`
  position: absolute;
  top: ${({ $top }) => $top || "18%"};
  left: ${({ $left }) => $left || "10%"};
  width: ${({ $size }) => $size || "86px"};
  height: 24px;
  border: 2px solid #9aa4b2;
  border-radius: 999px;
  opacity: 0.48;
  animation: ${float} 5.4s ease-in-out infinite;

  &::before,
  &::after {
    content: "";
    position: absolute;
    bottom: 8px;
    border: 2px solid #9aa4b2;
    border-bottom: 0;
    background: #f9fafb;
  }

  &::before {
    left: 14px;
    width: 26px;
    height: 20px;
    border-radius: 24px 24px 0 0;
  }

  &::after {
    right: 15px;
    width: 32px;
    height: 26px;
    border-radius: 30px 30px 0 0;
  }
`;

export const SceneText = styled.div`
  position: absolute;
  z-index: 5;
  top: 30px;
  left: 30px;
  width: min(520px, calc(100% - 60px));
  padding: 18px 20px;
  border: 2px solid #1f2933;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 8px 8px 0 rgba(31, 41, 51, 0.08);
  animation: ${rise} 0.36s ease both;

  h2 {
    margin: 0 0 8px;
    color: #111827;
    font-size: clamp(1.18rem, 2.2vw, 1.7rem);
  }

  p {
    margin: 0;
    color: #3b4653;
    font-size: clamp(0.96rem, 1.8vw, 1.1rem);
    line-height: 1.5;
    font-weight: 700;
  }

  @media (max-width: 720px) {
    top: 18px;
    left: 16px;
    width: calc(100% - 32px);
  }
`;

export const Progress = styled.div`
  position: absolute;
  z-index: 6;
  left: 0;
  bottom: 0;
  width: ${({ $value }) => `${Math.max(0, Math.min(100, $value))}%`};
  height: 5px;
  background: #1f2933;
  transition: width 0.08s linear;
`;

export const World = styled.div`
  position: absolute;
  left: 0;
  right: -100%;
  bottom: 96px;
  height: 280px;
  display: flex;
  gap: 90px;
  align-items: flex-end;
  padding-left: 54%;
  animation: ${scrollWorld} ${({ $duration }) => Math.max(4, $duration / 1000)}s linear forwards;

  @media (max-width: 720px) {
    bottom: 112px;
    padding-left: 70%;
    gap: 58px;
  }
`;

export const Ground = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 96px;
  border-top: 3px solid #1f2933;

  &::before {
    content: "";
    position: absolute;
    inset: 8px 0 auto;
    height: 2px;
    background: repeating-linear-gradient(90deg, #c3cad4 0 18px, transparent 18px 34px);
  }
`;

export const SceneObject = styled.div`
  min-width: ${({ $wide }) => ($wide ? "350px" : "230px")};
  height: 230px;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

export const Figure = styled.div`
  position: relative;
  width: ${({ $size }) => $size || "38px"};
  height: ${({ $height }) => $height || "92px"};
  border: 3px solid #1f2933;
  border-top: 0;
  border-radius: 22px 22px 8px 8px;
  background: ${({ $light }) => ($light ? "#ffffff" : "#f3f4f6")};

  &::before {
    content: "";
    position: absolute;
    top: -32px;
    left: 50%;
    width: 29px;
    height: 29px;
    border: 3px solid #1f2933;
    border-radius: 50%;
    background: #ffffff;
    transform: translateX(-50%);
  }

  &::after {
    content: "";
    position: absolute;
    top: 15px;
    left: -20px;
    right: -20px;
    height: 3px;
    background: #1f2933;
    transform: ${({ $arms }) => ($arms === "open" ? "rotate(0)" : "rotate(-10deg)")};
  }
`;

export const Halo = styled.div`
  position: absolute;
  top: -48px;
  left: 50%;
  width: 44px;
  height: 12px;
  border: 2px solid #8b949e;
  border-radius: 50%;
  transform: translateX(-50%);
`;

export const SimpleLine = styled.div`
  width: ${({ $w }) => $w || "92px"};
  height: ${({ $h }) => $h || "76px"};
  border: 3px solid #1f2933;
  border-top: ${({ $openTop }) => ($openTop ? 0 : "3px solid #1f2933")};
  border-radius: ${({ $radius }) => $radius || "10px"};
  background: ${({ $fill }) => $fill || "transparent"};
`;

export const Star = styled.div`
  position: absolute;
  top: 4px;
  left: 50%;
  width: 26px;
  height: 26px;
  transform: translateX(-50%) rotate(45deg);
  border: 3px solid #1f2933;
  background: #ffffff;
`;

export const Cross = styled.div`
  position: relative;
  width: 20px;
  height: ${({ $height }) => $height || "126px"};
  background: #1f2933;
  border-radius: 2px;

  &::before {
    content: "";
    position: absolute;
    top: 30px;
    left: 50%;
    width: ${({ $bar }) => $bar || "88px"};
    height: 18px;
    background: #1f2933;
    border-radius: 2px;
    transform: translateX(-50%);
  }
`;

export const Light = styled.div`
  position: absolute;
  inset: auto auto 36px 50%;
  width: ${({ $size }) => $size || "190px"};
  height: ${({ $size }) => $size || "190px"};
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.92), rgba(203, 213, 225, 0.16), transparent 70%);
  transform: translateX(-50%);
  animation: ${glow} 3.6s ease-in-out infinite;
`;

export const DecisionWrap = styled.div`
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 18px;
  padding: 34px;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.96), transparent 18rem),
    rgba(249, 250, 251, 0.96);
  animation: ${rise} 0.4s ease both;

  @media (max-width: 720px) {
    padding: 18px;
  }
`;

export const DecisionHeader = styled.div`
  max-width: 780px;

  h2 {
    margin: 0 0 10px;
    color: #111827;
    font-size: clamp(1.4rem, 3vw, 2.35rem);
  }

  p {
    margin: 0;
    color: #3b4653;
    font-size: clamp(1rem, 2vw, 1.22rem);
    font-weight: 800;
    line-height: 1.45;
  }
`;

export const Paths = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: stretch;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const PathCard = styled.button`
  position: relative;
  min-height: 280px;
  border: 2px solid #1f2933;
  border-radius: 22px;
  padding: 20px;
  background: ${({ $kind }) =>
    $kind === "wide"
      ? "linear-gradient(135deg, #ffffff, #eceff3)"
      : "linear-gradient(135deg, #ffffff, #f8fafc)"};
  color: #1f2933;
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  box-shadow: 8px 8px 0 rgba(31, 41, 51, 0.08);

  &:hover {
    transform: translateY(-2px);
  }

  h3 {
    position: relative;
    z-index: 2;
    margin: 0 0 8px;
    font-size: 1.28rem;
  }

  p {
    position: relative;
    z-index: 2;
    margin: 0;
    color: #52606d;
    font-weight: 700;
    line-height: 1.45;
  }
`;

export const PathRoad = styled.div`
  position: absolute;
  left: ${({ $kind }) => ($kind === "wide" ? "8%" : "32%")};
  right: ${({ $kind }) => ($kind === "wide" ? "8%" : "32%")};
  bottom: -22px;
  height: 210px;
  border-left: ${({ $kind }) => ($kind === "wide" ? "42px" : "16px")} solid rgba(31, 41, 51, 0.82);
  border-right: ${({ $kind }) => ($kind === "wide" ? "42px" : "16px")} solid rgba(31, 41, 51, 0.82);
  transform: perspective(240px) rotateX(54deg);
  opacity: 0.82;
`;

export const DecisionMessage = styled.div`
  min-height: 72px;
  border: 2px solid #1f2933;
  border-radius: 18px;
  background: #ffffff;
  padding: 16px 18px;
  color: #1f2933;
  font-weight: 900;
  line-height: 1.45;
  display: flex;
  align-items: center;
`;

export const SecretPixel = styled.button`
  position: fixed;
  z-index: 3000;
  right: 10px;
  bottom: 10px;
  width: 6px;
  height: 6px;
  border: 0;
  border-radius: 50%;
  background: rgba(31, 41, 51, 0.18);
  cursor: default;
  opacity: 0.34;

  &:hover {
    opacity: 0.82;
  }
`;
