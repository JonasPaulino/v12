import React, { useEffect, useMemo, useRef, useState } from "react";
import { finalDecision, storyScenes } from "./storyScenes";
import * as C from "./JesusStoryEasterEgg.styles";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const Person = ({ light = false, arms = "open", size, height }) => (
  <C.Figure $light={light} $arms={arms} $size={size} $height={height}>
    {light ? <C.Halo /> : null}
  </C.Figure>
);

const Group = ({ count = 3 }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
    {Array.from({ length: count }).map((_, index) => (
      <Person key={index} size="30px" height={index % 2 ? "78px" : "70px"} arms="low" />
    ))}
  </div>
);

const SceneIllustration = ({ type }) => {
  if (type === "birth") {
    return (
      <>
        <C.SceneObject $wide>
          <C.Star />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
            <Person size="32px" height="74px" arms="low" />
            <C.SimpleLine $w="96px" $h="54px" $radius="16px 16px 8px 8px" />
            <Person size="34px" height="82px" arms="low" />
          </div>
        </C.SceneObject>
        <C.SceneObject>
          <C.SimpleLine $w="140px" $h="96px" $openTop $radius="0 0 10px 10px" />
        </C.SceneObject>
      </>
    );
  }

  if (type === "disciples") {
    return (
      <>
        <C.SceneObject $wide>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 26 }}>
            <Person light />
            <Group count={4} />
          </div>
        </C.SceneObject>
        <C.SceneObject>
          <C.SimpleLine $w="120px" $h="70px" $radius="48px 48px 10px 10px" />
        </C.SceneObject>
      </>
    );
  }

  if (type === "miracles") {
    return (
      <>
        <C.SceneObject $wide>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 30 }}>
            <Person light />
            <Person size="30px" height="50px" arms="low" />
            <Group count={2} />
          </div>
        </C.SceneObject>
        <C.SceneObject>
          <C.Light $size="150px" />
          <C.SimpleLine $w="130px" $h="42px" $radius="999px" />
        </C.SceneObject>
      </>
    );
  }

  if (type === "teachings") {
    return (
      <>
        <C.SceneObject $wide>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>
            <Person light />
            <Group count={5} />
          </div>
        </C.SceneObject>
        <C.SceneObject>
          <C.SimpleLine $w="180px" $h="80px" $radius="80px 80px 8px 8px" />
        </C.SceneObject>
      </>
    );
  }

  if (type === "crossJourney") {
    return (
      <>
        <C.SceneObject $wide>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 30, transform: "rotate(-6deg)" }}>
            <Person light arms="low" />
            <C.Cross $height="112px" $bar="72px" />
          </div>
        </C.SceneObject>
        <C.SceneObject>
          <Group count={3} />
        </C.SceneObject>
      </>
    );
  }

  if (type === "death") {
    return (
      <>
        <C.SceneObject>
          <C.Cross $height="150px" />
        </C.SceneObject>
        <C.SceneObject>
          <C.Cross $height="116px" $bar="62px" />
        </C.SceneObject>
        <C.SceneObject>
          <C.Cross $height="116px" $bar="62px" />
        </C.SceneObject>
      </>
    );
  }

  if (type === "resurrection") {
    return (
      <>
        <C.SceneObject $wide>
          <C.Light />
          <C.SimpleLine $w="160px" $h="96px" $openTop $radius="80px 80px 12px 12px" />
          <div style={{ position: "absolute", bottom: 0, right: 50 }}>
            <C.SimpleLine $w="58px" $h="58px" $radius="50%" $fill="#ffffff" />
          </div>
        </C.SceneObject>
        <C.SceneObject>
          <Person light />
        </C.SceneObject>
      </>
    );
  }

  if (type === "appears") {
    return (
      <>
        <C.SceneObject $wide>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 30 }}>
            <Person light />
            <Group count={4} />
          </div>
        </C.SceneObject>
      </>
    );
  }

  if (type === "mission") {
    return (
      <>
        <C.SceneObject $wide>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 30 }}>
            <Person light />
            <Group count={5} />
          </div>
        </C.SceneObject>
        <C.SceneObject>
          <C.SimpleLine $w="34px" $h="130px" $radius="999px" />
        </C.SceneObject>
      </>
    );
  }

  if (type === "ascension") {
    return (
      <>
        <C.SceneObject $wide>
          <C.Light $size="240px" />
          <div style={{ transform: "translateY(-82px)" }}>
            <Person light />
          </div>
        </C.SceneObject>
        <C.SceneObject>
          <Group count={5} />
        </C.SceneObject>
      </>
    );
  }

  return null;
};

export const JesusStoryEasterEgg = () => {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isDecision, setIsDecision] = useState(false);
  const [progress, setProgress] = useState(0);
  const [decision, setDecision] = useState("");
  const frameRef = useRef(null);
  const startedAtRef = useRef(0);

  const scene = storyScenes[sceneIndex];
  const decisionText = useMemo(() => {
    if (decision === "wide") return finalDecision.wideMessage;
    if (decision === "narrow") return finalDecision.narrowMessage;
    return "Escolha um caminho para refletir sobre a decisão.";
  }, [decision]);

  useEffect(() => {
    if (isDecision || !scene) return undefined;

    setProgress(0);
    startedAtRef.current = performance.now();

    const tick = (time) => {
      const elapsed = time - startedAtRef.current;
      const nextProgress = clamp((elapsed / scene.duration) * 100, 0, 100);
      setProgress(nextProgress);

      if (elapsed >= scene.duration) {
        if (sceneIndex >= storyScenes.length - 1) {
          setIsDecision(true);
          return;
        }
        setSceneIndex((current) => current + 1);
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isDecision, scene, sceneIndex]);

  const restart = () => {
    setSceneIndex(0);
    setIsDecision(false);
    setDecision("");
    setProgress(0);
  };

  const skipToDecision = () => {
    setIsDecision(true);
    setDecision("");
    setProgress(100);
  };

  return (
    <C.Page>
      <C.Shell aria-label="Easter egg: história de Jesus">
        <C.TopBar>
          <div>
            <C.Eyebrow>V12 Easter Egg</C.Eyebrow>
            <C.Title>{isDecision ? finalDecision.title : scene.title}</C.Title>
          </div>
          <C.Actions>
            {!isDecision ? (
              <C.Button type="button" onClick={skipToDecision}>
                Pular introdução
              </C.Button>
            ) : null}
            <C.Button type="button" $dark onClick={restart}>
              Reiniciar história
            </C.Button>
          </C.Actions>
        </C.TopBar>

        <C.Stage>
          <C.Sky>
            <C.Cloud $top="16%" $left="12%" />
            <C.Cloud $top="26%" $left="68%" $size="104px" />
            <C.Cloud $top="10%" $left="44%" $size="72px" />
          </C.Sky>

          {!isDecision ? (
            <>
              <C.SceneText key={scene.id}>
                <h2>{scene.title}</h2>
                <p>{scene.text}</p>
              </C.SceneText>
              <C.World key={scene.id} $duration={scene.duration}>
                <SceneIllustration type={scene.type} />
              </C.World>
              <C.Ground />
              <C.Progress $value={progress} />
            </>
          ) : (
            <C.DecisionWrap>
              <C.DecisionHeader>
                <h2>{finalDecision.title}</h2>
                <p>{finalDecision.text}</p>
              </C.DecisionHeader>

              <C.Paths>
                <C.PathCard type="button" $kind="wide" onClick={() => setDecision("wide")}>
                  <h3>Caminho largo</h3>
                  <p>Visualmente fácil, cheio de distrações, mas distante da cruz.</p>
                  <C.PathRoad $kind="wide" />
                </C.PathCard>

                <C.PathCard type="button" $kind="narrow" onClick={() => setDecision("narrow")}>
                  <h3>Caminho estreito</h3>
                  <p>Simples, exigente, com uma cruz ao fundo e luz no fim.</p>
                  <C.Light $size="140px" />
                  <C.PathRoad $kind="narrow" />
                </C.PathCard>
              </C.Paths>

              <C.DecisionMessage>{decisionText}</C.DecisionMessage>
            </C.DecisionWrap>
          )}
        </C.Stage>
      </C.Shell>
    </C.Page>
  );
};
