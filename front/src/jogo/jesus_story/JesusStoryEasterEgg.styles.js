import styled, { keyframes } from "styled-components";

const groundMove = keyframes`
  from {
    background-position: 0 0;
  }
  to {
    background-position: -96px 0;
  }
`;

const bob = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
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
    opacity: 0.25;
    transform: scale(0.94);
  }
  50% {
    opacity: 0.58;
    transform: scale(1.04);
  }
`;

const rise = keyframes`
  from {
    transform: translateY(14px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const ascend = keyframes`
  0%, 100% {
    transform: translateY(-54px);
  }
  50% {
    transform: translateY(-76px);
  }
`;

export const Page = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.92), transparent 24rem),
    linear-gradient(180deg, #f9fafb 0%, #f1f3f6 52%, #ffffff 100%);
  color: #1f2933;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
`;

export const Shell = styled.section`
  width: min(1180px, 100%);
  min-height: min(730px, calc(100vh - 44px));
  border: 2px solid #1f2933;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
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
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
  }
`;

export const Stage = styled.div`
  position: relative;
  flex: 1;
  min-height: 540px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.25), transparent 0 72%, #f7f8fa 72% 100%),
    repeating-linear-gradient(90deg, rgba(31, 41, 51, 0.035) 0 1px, transparent 1px 58px);

  @media (max-width: 720px) {
    min-height: 650px;
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
  opacity: 0.44;
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

export const TextPanel = styled.div`
  position: absolute;
  z-index: 9;
  top: 28px;
  left: 28px;
  width: min(550px, calc(100% - 56px));
  padding: 16px 18px;
  border: 2px solid #1f2933;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.93);
  box-shadow: 8px 8px 0 rgba(31, 41, 51, 0.08);
  animation: ${rise} 0.28s ease both;

  h2 {
    margin: 0 0 8px;
    color: #111827;
    font-size: clamp(1.16rem, 2.2vw, 1.68rem);
  }

  p {
    margin: 0;
    color: #3b4653;
    font-size: clamp(0.96rem, 1.7vw, 1.08rem);
    line-height: 1.5;
    font-weight: 750;
  }

  @media (max-width: 720px) {
    top: 16px;
    left: 14px;
    width: calc(100% - 28px);
  }
`;

export const SceneCounter = styled.span`
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border: 2px solid #1f2933;
  border-radius: 999px;
  margin-bottom: 9px;
  color: #1f2933;
  font-size: 0.76rem;
  font-weight: 900;
`;

export const Progress = styled.div`
  position: absolute;
  z-index: 12;
  left: 0;
  bottom: 0;
  width: ${({ $value }) => `${Math.max(0, Math.min(100, $value))}%`};
  height: 5px;
  background: #1f2933;
  transition: width 0.08s linear;
`;

export const Ground = styled.div`
  position: absolute;
  z-index: 2;
  left: 0;
  right: 0;
  bottom: 116px;
  height: 24px;
  border-top: 3px solid #1f2933;
  background: repeating-linear-gradient(90deg, #c3cad4 0 18px, transparent 18px 34px);
  background-size: 96px 2px;
  background-repeat: repeat-x;
  background-position: 0 9px;
  animation: ${groundMove} 0.9s linear infinite;

  @media (max-width: 720px) {
    bottom: 126px;
  }
`;

export const Runner = styled.div`
  position: absolute;
  z-index: 7;
  left: clamp(64px, 13vw, 150px);
  bottom: 118px;
  width: 96px;
  height: 142px;
  animation: ${bob} 0.42s ease-in-out infinite;

  > span {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    transform: scale(1.95);
    transform-origin: bottom left;
  }

  > span > span {
    padding: 3px 7px;
    border: 1px solid #1f2933;
    border-radius: 999px;
    background: #ffffff;
    color: #1f2933;
    font-size: 0.46rem;
    font-weight: 950;
    line-height: 1;
    white-space: nowrap;
  }

  @media (max-width: 720px) {
    left: 34px;
    bottom: 128px;
    width: 78px;

    > span {
      transform: scale(1.56);
    }
  }
`;

export const Track = styled.div`
  position: absolute;
  z-index: 4;
  left: 0;
  bottom: 116px;
  width: 6400px;
  height: 330px;
  transition: transform 0.08s linear;
  will-change: transform;

  @media (max-width: 720px) {
    bottom: 126px;
  }
`;

export const SceneStation = styled.article`
  position: absolute;
  bottom: 0;
  width: 430px;
  height: 260px;
  opacity: ${({ $active }) => ($active ? 1 : 0.48)};
  transform: ${({ $active }) => ($active ? "scale(1)" : "scale(0.93)")};
  transform-origin: bottom center;
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
`;

export const StationMarker = styled.div`
  position: absolute;
  left: 34px;
  bottom: -7px;
  width: 12px;
  height: 12px;
  border: 3px solid #1f2933;
  border-radius: 50%;
  background: #ffffff;
`;

export const ArtRow = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  min-height: 150px;
  display: flex;
  align-items: flex-end;
  gap: 26px;
`;

export const SpriteWrap = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  flex: 0 0 auto;
  transform: scale(${({ $scale }) => $scale || 1});
  transform-origin: bottom center;

  > span {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  > span > svg,
  > svg {
    display: block;
    image-rendering: pixelated;
  }

  > span > span {
    max-width: 88px;
    padding: 3px 6px;
    border: 1px solid #8b949e;
    border-radius: 999px;
    background: #ffffff;
    color: #52606d;
    font-size: 0.62rem;
    font-weight: 850;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
  }
`;

export const Manger = styled.div`
  width: 58px;
  height: 30px;
  border: 3px solid #1f2933;
  border-radius: 8px;
  background: #ffffff;
`;

export const HelpedPerson = styled.div`
  transform: translateY(22px) rotate(-90deg);
`;

export const LightBeam = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.96), rgba(203, 213, 225, 0.22), transparent 72%);
  animation: ${glow} 3.4s ease-in-out infinite;
`;

export const Hill = styled.div`
  width: 130px;
  height: 54px;
  border: 3px solid #1f2933;
  border-bottom: 0;
  border-radius: 90px 90px 0 0;
`;

export const CarriedCross = styled.div`
  transform: translate(-8px, -28px) rotate(-34deg);
`;

export const TombLight = styled.div`
  margin-left: -74px;
  margin-right: -26px;
  pointer-events: none;
`;

export const Sign = styled.div`
  min-width: 76px;
  height: 64px;
  border: 3px solid #1f2933;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1f2933;
  font-size: 1.2rem;
  font-weight: 950;
  background: #ffffff;
`;

export const AscensionLight = styled.div`
  position: absolute;
  left: 8px;
  bottom: 0;
  width: 210px;
  height: 240px;
  background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.98), rgba(203, 213, 225, 0.22), transparent 72%);
  animation: ${glow} 3.4s ease-in-out infinite;
`;

export const RisingPerson = styled.div`
  position: relative;
  z-index: 2;
  animation: ${ascend} 3.4s ease-in-out infinite;
`;

export const StationCaption = styled.div`
  position: absolute;
  left: 0;
  bottom: -92px;
  min-width: 210px;
  padding: 10px 12px;
  border: 2px solid #1f2933;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 5px 5px 0 rgba(31, 41, 51, 0.08);

  strong,
  span {
    display: block;
  }

  strong {
    color: #111827;
    font-size: 0.86rem;
  }

  span {
    margin-top: 3px;
    color: #667085;
    font-size: 0.74rem;
    font-weight: 800;
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
  z-index: 20;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 18px;
  padding: 34px;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.96), transparent 18rem),
    rgba(249, 250, 251, 0.97);
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
