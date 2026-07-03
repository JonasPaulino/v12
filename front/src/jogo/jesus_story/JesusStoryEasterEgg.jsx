import React, { useEffect, useMemo, useRef, useState } from "react";
import { finalDecision, storyScenes } from "./storyScenes";
import { PixelCross, PixelJesus, PixelPerson, PixelStable, PixelTomb, PixelViewer } from "./sprites/PixelSprites";
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

const SceneArt = ({ type }) => {
  if (type === "birth") {
    return (
      <C.ArtRow>
        <C.SpriteWrap $scale={1.1}>
          <PixelStable />
        </C.SpriteWrap>
        <C.SpriteWrap>
          <PixelPerson label="Maria" />
        </C.SpriteWrap>
        <C.Manger />
        <C.SpriteWrap>
          <PixelPerson label="José" />
        </C.SpriteWrap>
      </C.ArtRow>
    );
  }

  if (type === "disciples") {
    return (
      <C.ArtRow>
        <C.SpriteWrap $scale={1.18}>
          <PixelJesus pose="blessing" label="Jesus" />
        </C.SpriteWrap>
        <C.SpriteWrap>
          <PixelPerson pose="walk" label="Pedro" />
        </C.SpriteWrap>
        <C.SpriteWrap>
          <PixelPerson pose="walk" label="João" />
        </C.SpriteWrap>
        <C.SpriteWrap>
          <PixelPerson label="André" />
        </C.SpriteWrap>
      </C.ArtRow>
    );
  }

  if (type === "miracles") {
    return (
      <C.ArtRow>
        <C.SpriteWrap $scale={1.18}>
          <PixelJesus pose="blessing" label="Jesus" />
        </C.SpriteWrap>
        <C.HelpedPerson>
          <C.SpriteWrap>
            <PixelPerson label="Curado" />
          </C.SpriteWrap>
        </C.HelpedPerson>
        <C.LightBeam />
      </C.ArtRow>
    );
  }

  if (type === "teachings") {
    return (
      <C.ArtRow>
        <C.SpriteWrap $scale={1.16}>
          <PixelJesus pose="blessing" label="Jesus" />
        </C.SpriteWrap>
        <C.Hill />
        <C.SpriteWrap>
          <PixelPerson label="Ouvinte" />
        </C.SpriteWrap>
        <C.SpriteWrap>
          <PixelPerson label="Ouvinte" />
        </C.SpriteWrap>
        <C.SpriteWrap>
          <PixelPerson label="Ouvinte" />
        </C.SpriteWrap>
      </C.ArtRow>
    );
  }

  if (type === "crossJourney") {
    return (
      <C.ArtRow>
        <C.SpriteWrap $scale={1.18}>
          <PixelJesus pose="walk2" label="Jesus" />
        </C.SpriteWrap>
        <C.CarriedCross>
          <PixelCross small />
        </C.CarriedCross>
      </C.ArtRow>
    );
  }

  if (type === "death") {
    return (
      <C.ArtRow>
        <PixelCross />
        <PixelCross small />
        <PixelCross small />
      </C.ArtRow>
    );
  }

  if (type === "resurrection") {
    return (
      <C.ArtRow>
        <C.SpriteWrap $scale={1.18}>
          <PixelTomb />
        </C.SpriteWrap>
        <C.TombLight>
          <C.LightBeam />
        </C.TombLight>
        <C.SpriteWrap $scale={1.18}>
          <PixelJesus pose="blessing" label="Vivo" />
        </C.SpriteWrap>
      </C.ArtRow>
    );
  }

  if (type === "appears") {
    return (
      <C.ArtRow>
        <C.SpriteWrap $scale={1.18}>
          <PixelJesus pose="blessing" label="Jesus" />
        </C.SpriteWrap>
        <C.SpriteWrap>
          <PixelPerson label="Discípulo" />
        </C.SpriteWrap>
        <C.SpriteWrap>
          <PixelPerson label="Discípulo" />
        </C.SpriteWrap>
        <C.SpriteWrap>
          <PixelPerson label="Discípulo" />
        </C.SpriteWrap>
      </C.ArtRow>
    );
  }

  if (type === "mission") {
    return (
      <C.ArtRow>
        <C.SpriteWrap $scale={1.18}>
          <PixelJesus pose="blessing" label="Jesus" />
        </C.SpriteWrap>
        <C.Sign>Ide</C.Sign>
        <C.SpriteWrap>
          <PixelPerson label="Mundo" />
        </C.SpriteWrap>
      </C.ArtRow>
    );
  }

  if (type === "ascension") {
    return (
      <C.ArtRow>
        <C.AscensionLight />
        <C.RisingPerson>
          <C.SpriteWrap $scale={1.18}>
            <PixelJesus pose="jump" label="Jesus" />
          </C.SpriteWrap>
        </C.RisingPerson>
        <C.SpriteWrap>
          <PixelPerson label="Discípulo" />
        </C.SpriteWrap>
        <C.SpriteWrap>
          <PixelPerson label="Discípulo" />
        </C.SpriteWrap>
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
                <PixelViewer />
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
