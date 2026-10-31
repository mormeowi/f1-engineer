/**
 * Global application state. Everything the UI shows is derived from this object.
 * 
 * state fields
 *   cars   list of cars in the garage (see makeCar in model/cars.js)
 *   a      index of the active car (the chip that is highlighted)
 *   tr     index of the selected track in TRACKS
 *   eq     true = "equal power" mode: team performance values are ignored
 *   pct    race distance in percent (25 / 35 / 50 / 100)
 *   tab    active tab: 0 car, 1 strategy, 2 test
 *   spd    simulation speed multiplier in the test tab
 *   run    true while the race animation is running
 *   human  true = realistic driving: lap-to-lap pace noise, mistakes, slow starts and pit stops
 *   dnf    true = crashes, contact, damage and technical failures can happen (retirements)
 *   gap    timing tower mode: 'int' = interval to the car ahead, 'gap' = gap to the leader
 *   cam    true = camera follows the selected car, false = whole track
 *   z      camera zoom factor
 *   lang   'ru' or 'en'
 *   draft  pilot being edited in the Pilots tab
 *   weather 'dry' | 'damp' | 'rain' (model/weather.js)
 *   theme  'sys' | 'white' | 'black'
 *   volume master volume 0-100 (settings menu)
 *   sim    current race simulation (created by initSimulation), see simulation.js
 *   key    signature of the last simulation inputs; the simulation restarts when it changes
 */

const state = {
    cars: [], a: 0, tr: 0, eq: false, pct: 100, tab: 0, tc: 'S', fuel: 10, spd: 5, run: false, tm: 0, cam: true,
    theme: 'sys',
    weather: 'dry',
    volume: 60,
    human: false,
    dnf: false,
    gap: 'int', z: 1
};

let nextCarId = 0;
let lastFrameTime = 0;
