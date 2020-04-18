import { h, Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Audio } from '../vendor/types';
import { videosDB, settingsDB } from '../store';
import PlayerTimeline from './PlayerTimeline';
import PlayerPlaybackSpeed from './PlayerPlaybackSpeed';
import PlayerControls from './PlayerControls';
import PlayerReplay from './PlayerReplay';

import './Player.css';

interface Props {
  audio: Audio;
  passStartTime: Function;
  setError: Function;
  className?: string;
}

const Player = ({ audio, passStartTime, setError, className }: Props) => {
  const [paused, setPaused] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [time, setTime] = useState(0);
  const [refLoaded, setRefLoaded] = useState(false);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const [interval, setInterval] = useState<number | boolean>(0);

  useEffect(() => {
    setRefLoaded(true);
    if ('mediaSession' in navigator) {
      const player = playerRef.current as HTMLAudioElement;

      const artwork = [];
      audio.images.forEach(image => {
        artwork.push({
          src: image.url,
        });
      });

      navigator.mediaSession.metadata = new MediaMetadata({
        title: audio.title,
        artist: audio.author,
        album: 'YouTube Audio Player',
        artwork,
      });

      navigator.mediaSession.setActionHandler('play', () => player.play());
      navigator.mediaSession.setActionHandler('pause', () => player.pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        player.currentTime = player.currentTime - 30;
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        player.currentTime = player.currentTime + 30;
      });
      //navigator.mediaSession.setActionHandler('previoustrack', function() {});
      //navigator.mediaSession.setActionHandler('nexttrack', function() {});
    }
  }, []);

  useEffect(() => {
    videosDB.get(audio.id).then(dbVideo => {
      if (dbVideo && dbVideo.time) {
        playerRef.current.currentTime = dbVideo.time;
      }
    });

    return () => {
      if (playerRef !== null) {
        videosDB.updateObject(audio.id, {
          time: playerRef.current.currentTime,
        });
      }
    };
  }, [playerRef, interval]);

  return (
    <div className={`player ${className}`}>
      <audio
        controls={false}
        className="player__audio"
        ref={playerRef}
        onError={() => setError('There was an error playing the audio file')}
        onPause={() => setPaused(true)}
        onPlay={() => setPaused(false)}
        onRateChange={e =>
          setPlaybackRate((e.target as HTMLAudioElement).playbackRate)
        }
        onTimeUpdate={() => {
          window.setInterval(() => {
            if (playerRef.current !== null) {
              setTime(Math.floor(playerRef.current.currentTime));
            }
          }, 1000);
        }}
      >
        {Object.keys(audio.formats).length !== 0 ? (
          Object.keys(audio.formats).map(mime => (
            <source
              src={`https://yt-source.nico.dev/play/${encodeURIComponent(
                audio.formats[mime]
              )}`}
              type={mime}
              onError={() =>
                setError('There was an error loading the audio file')
              }
            />
          ))
        ) : (
          <source src={audio.url} type="audio/ogg" />
        )}
      </audio>
      {playerRef && playerRef.current !== null && (
        <Fragment>
          <div className="player__controls">
            <PlayerPlaybackSpeed
              player={playerRef.current}
              speed={playbackRate}
              className="player__speed"
            />
            <PlayerControls player={playerRef.current} paused={paused} />
            <PlayerReplay
              player={playerRef.current}
              className="player__replay"
            />
          </div>
          <PlayerTimeline
            player={playerRef.current}
            time={time}
            className="player__timeline"
          />
        </Fragment>
      )}
    </div>
  );
};

export default Player;
