import React, { useEffect, useMemo, useRef, useState } from "react";
import { finalDecision, storyScenes } from "./storyScenes";
import * as C from "./JesusStoryEasterEgg.styles";

const SCENE_STEP = 560;
const RUNNER_OFFSET = 260;

const sceneLabels = {
  birth: ["Maria", "José", "Belém"],
  disciples: ["Jesus", "Discípulos"],
  miracles: ["Cura", "Consolo"],
  teachings: ["Ensino", "Multidão"],
  crossJourney: ["A cruz", "Amor"],
  death: ["Entrega", "Silêncio"],
  resurrection: ["Túmulo vazio", "Luz"],
  appears: ["Fé", "Paz"],
  mission: ["Ide", "Evangelho"],
  ascension: ["Promessa", "Voltará"],
};

const useJourneyClock = ({ isDecision, sceneIndex, setSceneIndex, setIsDecision }) => {
  const frameRef = useRef(null);
  const startedAtRef = useRef(0);
  const elapsedBeforePauseRef = useRef(0);
  const elapsedRef = useRef(0);
  const sceneIndexRef = useRef(sceneIndex);
  const [elapsed, setElapsed] = useState(0);

  const totalDuration = useMemo(
    () => storyScenes.reduce((sum, scene) => sum + scene.duration, 0),
    []
  );

  useEffect(() => {
    sceneIndexRef.current = sceneIndex;
  }, [sceneIndex]);

  useEffect(() => {
    if (isDecision) return undefined;

    startedAtRef.current = performance.now() - elapsedBeforePauseRef.current;

    const tick = (now) => {
      const nextElapsed = Math.min(now - startedAtRef.current, totalDuration);
      let cumulative = 0;
      let nextIndex = 0;

      for (let index = 0; index < storyScenes.length; index += 1) {
        cumulative += storyScenes[index].duration;
        if (nextElapsed <= cumulative) {
          nextIndex = index;
          break;
        }
      }

      setElapsed(nextElapsed);
      elapsedRef.current = nextElapsed;

      if (nextIndex !== sceneIndexRef.current) {
        sceneIndexRef.current = nextIndex;
        setSceneIndex(nextIndex);
      }

      if (nextElapsed >= totalDuration) {
        setIsDecision(true);
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      elapsedBeforePauseRef.current = elapsedRef.current;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isDecision, setIsDecision, setSceneIndex, totalDuration]);

  const resetClock = () => {
    elapsedBeforePauseRef.current = 0;
    elapsedRef.current = 0;
    sceneIndexRef.current = 0;
    setElapsed(0);
  };

  const finishClock = () => {
    elapsedBeforePauseRef.current = totalDuration;
    elapsedRef.current = totalDuration;
    sceneIndexRef.current = storyScenes.length - 1;
    setElapsed(totalDuration);
  };

  return { elapsed, totalDuration, resetClock, finishClock };
};

const MiniPerson = ({ $kind = "person", label }) => (
  <C.MiniPerson $kind={$kind}>
    <C.Head $kind={$kind} />
    <C.Body $kind={$kind} />
    <C.Arm $side="left" />
    <C.Arm $side="right" />
    <C.Leg $side="left" />
    <C.Leg $side="right" />
    {label ? <C.MiniLabel>{label}</C.MiniLabel> : null}
  </C.MiniPerson>
);

const Cross = ({ small = false }) => (
  <C.Cross $small={small}>
    <span />
  </C.Cross>
);

const SceneArt = ({ type }) => {
  if (type === "birth") {
    return (
      <C.ArtRow>
        <C.Stable>
          <C.Star />
          <MiniPerson label="Maria" />
          <C.Manger />
          <MiniPerson label="José" />
        </C.Stable>
      </C.ArtRow>
    );
  }

  if (type === "disciples") {
    return (
      <C.ArtRow>
        <MiniPerson $kind="jesus" label="Jesus" />
        <MiniPerson label="Pedro" />
        <MiniPerson label="João" />
        <MiniPerson label="André" />
      </C.ArtRow>
    );
  }

  if (type === "miracles") {
    return (
      <C.ArtRow>
        <MiniPerson $kind="jesus" label="Jesus" />
        <C.HelpedPerson>
          <MiniPerson label="Curado" />
        </C.HelpedPerson>
        <C.LightBeam />
      </C.ArtRow>
    );
  }

  if (type === "teachings") {
    return (
      <C.ArtRow>
        <MiniPerson $kind="jesus" label="Jesus" />
        <C.Hill />
        <MiniPerson label="Ouvinte" />
        <MiniPerson label="Ouvinte" />
        <MiniPerson label="Ouvinte" />
      </C.ArtRow>
    );
  }

  if (type === "crossJourney") {
    return (
      <C.ArtRow>
        <MiniPerson $kind="jesus" label="Jesus" />
        <C.CarriedCross>
          <Cross small />
        </C.CarriedCross>
      </C.ArtRow>
    );
  }

  if (type === "death") {
    return (
      <C.ArtRow>
        <Cross />
        <Cross small />
        <Cross small />
      </C.ArtRow>
    );
  }

  if (type === "resurrection") {
    return (
      <C.ArtRow>
        <C.Tomb>
          <C.LightBeam />
        </C.Tomb>
        <MiniPerson $kind="jesus" label="Vivo" />
      </C.ArtRow>
    );
  }

  if (type === "appears") {
    return (
      <C.ArtRow>
        <MiniPerson $kind="jesus" label="Jesus" />
        <MiniPerson label="Discípulo" />
        <MiniPerson label="Discípulo" />
        <MiniPerson label="Discípulo" />
      </C.ArtRow>
    );
  }

  if (type === "mission") {
    return (
      <C.ArtRow>
        <MiniPerson $kind="jesus" label="Jesus" />
        <C.Sign>Ide</C.Sign>
        <MiniPerson label="Mundo" />
      </C.ArtRow>
    );
  }

  if (type === "ascension") {
    return (
      <C.ArtRow>
        <C.AscensionLight />
        <C.RisingPerson>
          <MiniPerson $kind="jesus" label="Jesus" />
        </C.RisingPerson>
        <MiniPerson label="Discípulo" />
        <MiniPerson label="Discípulo" />
      </C.ArtRow>
    );
  }

  return null;
};

export const JesusStoryEasterEgg = () => {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isDecision, setIsDecision] = useState(false);
  const [decision, setDecision] = useState("");
  const scene = storyScenes[sceneIndex];
  const { elapsed, totalDuration, resetClock, finishClock } = useJourneyClock({
    isDecision,
    sceneIndex,
    setSceneIndex,
    setIsDecision,
  });

  const progress = totalDuration ? Math.min((elapsed / totalDuration) * 100, 100) : 0;
  const journeyDistance = (elapsed / totalDuration) * ((storyScenes.length - 1) * SCENE_STEP);
  const trackOffset = `calc(34vw - ${RUNNER_OFFSET + journeyDistance}px)`;

  const decisionText = useMemo(() => {
    if (decision === "wide") return finalDecision.wideMessage;
    if (decision === "narrow") return finalDecision.narrowMessage;
    return "Escolha um caminho para refletir sobre a decisão.";
  }, [decision]);

  const restart = () => {
    resetClock();
    setSceneIndex(0);
    setIsDecision(false);
    setDecision("");
  };

  const skipToDecision = () => {
    finishClock();
    setSceneIndex(storyScenes.length - 1);
    setIsDecision(true);
    setDecision("");
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
                Ir para decisão final
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
            <C.Cloud $top="28%" $left="68%" $size="106px" />
            <C.Cloud $top="10%" $left="44%" $size="74px" />
          </C.Sky>

          {!isDecision ? (
            <>
              <C.TextPanel key={scene.id}>
                <C.SceneCounter>
                  {sceneIndex + 1}/{storyScenes.length}
                </C.SceneCounter>
                <h2>{scene.title}</h2>
                <p>{scene.text}</p>
              </C.TextPanel>

              <C.Runner>
                <C.RunnerName>Você</C.RunnerName>
                <C.RunnerHead />
                <C.RunnerBody />
                <C.RunnerArm />
                <C.RunnerLeg $side="front" />
                <C.RunnerLeg $side="back" />
              </C.Runner>

              <C.Track style={{ transform: `translateX(${trackOffset})` }}>
                {storyScenes.map((item, index) => (
                  <C.SceneStation
                    key={item.id}
                    $active={index === sceneIndex}
                    style={{ left: `${index * SCENE_STEP}px` }}
                  >
                    <C.StationMarker />
                    <SceneArt type={item.type} />
                    <C.StationCaption>
                      <strong>{item.title}</strong>
                      <span>{sceneLabels[item.type]?.join(" • ")}</span>
                    </C.StationCaption>
                  </C.SceneStation>
                ))}
              </C.Track>

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
