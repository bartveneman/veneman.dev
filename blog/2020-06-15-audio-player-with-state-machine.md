---
title: Audio player in plain JavaScript with State Machine
tags: ['javascript', 'html', 'state-machine']
---

The `<audio>` element is a tiny, yet powerful thing. As an exercise to improve my knowledge about State Machines [with XState](https://xstate.js.org), I thought it would be fun to implement a State Machine for an audio player.

<p class="codepen" data-height="351" data-theme-id="dark" data-default-tab="js,result" data-user="bartveneman" data-slug-hash="BajNBrx" data-preview="true" style="height: 351px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;" data-pen-title="Audio player in vanilla JS with State Machine (xstate)">
  <span>See the Pen <a href="https://codepen.io/bartveneman/pen/BajNBrx" rel=" external">
  Audio player in vanilla JS with State Machine (xstate)</a> by Bart Veneman (<a href="https://codepen.io/bartveneman" rel=" external">@bartveneman</a>)
  on <a href="https://codepen.io" rel=" external">CodePen</a>.</span>
</p>
<script defer src="https://static.codepen.io/assets/embed/ei.js"></script>

## Features

- Show and update current time
- Show full duration time
- Update progress as audio plays
- Scrub/seek along progress bar
- No framework, only a handful of DOM manipulation methods

## The State Machine

In it's most basic form, the state machine looks like this:

```js
import { createMachine, interpret, assign } from "xstate";

const machine = createMachine(
  {
    initial: "paused",
    context: {
      currentTime: 0, // (s)
      durationTime: 0, // (s)
    },
    on: {
      durationchange: {
        actions: [
          assign({
            durationTime: (context, event) => event.target.duration,
          }),
          "renderDurationTime",
        ],
      },
      timeupdate: {
        actions: [
          assign({
            currentTime: (context, event) => event.target.currentTime,
          }),
          "renderCurrentTime",
          "updateScrubber",
        ],
      },
      SCRUB: {
        actions: [
          assign({
            currentTime: (context, event) => event.value * context.durationTime,
          }),
          "updateAudioCurrentTime",
          "renderCurrentTime",
          "updateScrubber",
        ],
      },
    },
    states: {
      paused: {
        on: {
          TOGGLE_PLAY: {
            target: "playing",
            actions: ["playAudio"],
          },
        },
      },
      playing: {
        on: {
          TOGGLE_PLAY: {
            target: "paused",
            actions: ["pauseAudio"],
          },
        },
      },
    },
  },
  {
    actions: {
      playAudio: () => {
        audio.play();
        playToggle.dataset.state = "playing";
      },
      pauseAudio: () => {
        audio.pause();
        playToggle.dataset.state = "paused";
      },
      updateAudioCurrentTime: (context, event) => {
        audio.currentTime = context.currentTime;
      },
      renderCurrentTime: (context) => {
        currentTime.innerText = formatDuration(context.currentTime);
      },
      renderDurationTime: (context) => {
        durationTime.innerText = formatDuration(context.durationTime);
      },
      updateScrubber: (context) => {
        // update position of the <input type="range"> element
        scrubber.value = context.currentTime / context.durationTime;
        // update position of the <progress> element
        progress.value = context.currentTime / context.durationTime;
      },
    },
  }
);
```

And here is what the XState visualizer makes of it:

[![XState visualisation of the audio player State Machine](/img/2020-06-15-audio-player-with-state-machine-viz.png)](/img/2020-06-15-audio-player-with-state-machine-viz.png)

You can see that there are only _two_ possible states, but there is a list of events that we need to handle in order to make this work.

## Sending and handling events

This app creates and handles a handful of events. The State Machine than receives and handles these events to update the audio playhead, playbacktime and total time.
As you can see, all events are handles regardless of the current state. That's because it doesn't matter whether the app is currently playing or not to update the internal timers.

```js
const machine = createMachine(/* machine definition */);
const service = interpret(machine).start();

audio.addEventListener("timeupdate", service.send);
audio.addEventListener("durationchange", service.send);

// A click of the play/pause <button>
playToggle.addEventListener("click", (event) => {
  service.send({ type: "TOGGLE_PLAY" });
});

// User changed the audio playhead with the <input type="range>
scrubber.addEventListener("input", (event) => {
  service.send({
    type: "SCRUB",
    value: parseFloat(event.target.value),
  });
});
```

### Toggling play and pause

The pause and play events are the most basic events. They both toggle the current playing or paused state. Sending `PAUSE` to a playing machine does two things, as can be seen in the state machine: play/pause the `<audio>` element and toggle the `data-state` of the play/pause `<button>`.

### Receiving `audio` events

The `audio` element comes with a suprising number of events that it can emit. For simplicity, these are the ones that the audio player will act upon:

- [`timeupdate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/timeupdate_event): The timeupdate event is fired when the time indicated by the currentTime attribute has been updated. So as the audio plays along, this event is thrown from time to time. It will emit an event like `{ type: 'timeupdate', target: { currentTime: 1234 } }`, where `currentTime` is in seconds.
- [`durationchange`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/durationchange_event): The docs say that this is fired when the duration attribute has been updated. It basically means that this event is emitted when the audio is downloaded fully and the full duration is known. It will emit an event like `{ type: 'durationchange', target: { duration: 1234 } }`, where `duration` is in seconds.

### Scrubber events

The final event that needs to be handled is the 'scrubber' event. That's the event emitted by the range input whenever it's value changes, meaning that the user changed the position of the audio playhead. This value is between 0 and 1, as dictated in the HTML. The state machine will calculate the new currentTime of the player based on this number.

## No framework

At first I was tempted to use Svelte or React to implement this player, but here's the thing: XState makes events, actions and transitions _so explicit_, I can easily update the DOM myself whenever I need to. Look at the following `actions` part of the state machine. No client-side framework will make this any easier (for me, at least), but then again, this is a _very_ small app.

```js
const machine = createMachine({
  initial: "paused",
  states: {
    playing: {
      /* ... */
    },
    paused: {
      /* ... */
    },
  },
  actions: {
    playAudio: () => {
      audio.play();
      playToggle.dataset.state = "playing";
    },
    pauseAudio: () => {
      audio.pause();
      playToggle.dataset.state = "paused";
    },
    updateAudioCurrentTime: (context, event) => {
      audio.currentTime = context.currentTime;
    },
    renderCurrentTime: (context) => {
      currentTime.innerText = formatDuration(context.currentTime);
    },
    renderDurationTime: (context) => {
      durationTime.innerText = formatDuration(context.durationTime);
    },
    updateScrubber: (context) => {
      // update position of the <input type="range"> element
      scrubber.value = context.currentTime / context.durationTime;
      // update position of the <progress> element
      progress.value = context.currentTime / context.durationTime;
    },
  },
});
```

## Credits

- [David Khourshid (David K. Piano)](https://twitter.com/DavidKPiano) for building and maintaining XState, one of the most exciting pieces of engineering that I've seen recently (along with Svelte).
- [Dave Rupert](https://daverupert.com/) for implementing the audio player on [ShopTalkShow.com](https://shoptalkshow.com) where I found the `<input type="range">` trick.
