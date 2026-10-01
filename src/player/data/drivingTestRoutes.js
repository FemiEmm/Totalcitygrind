export const DRIVING_TEST_ROUTES = Object.freeze([
  ["res-stop-loop", "res-stop-home", "res-stop-garage", "res-stop-clinic", "res-stop-estate"],
  ["res-stop-garage", "work-stop-west", "work-stop-terminal-a", "work-stop-market", "work-stop-east"],
  ["res-stop-clinic", "work-stop-terminal-a", "work-stop-office", "work-stop-interchange", "work-stop-dealer"],
  ["res-stop-estate", "wealth-stop-olowo-epo", "wealth-stop-north", "wealth-stop-circle", "wealth-stop-shopping"],
  ["wealth-stop-hospital", "wealth-stop-south", "wealth-stop-hotel", "wealth-stop-circle", "wealth-stop-waterway"],
  ["work-stop-west", "work-stop-market", "work-stop-office", "work-stop-interchange", "work-stop-terminal-b"],
  ["night-stop-work-link", "night-stop-clubs", "night-stop-circle", "night-stop-restaurants", "night-stop-events"],
  ["night-stop-old-airport", "night-stop-circle", "night-stop-harbour", "night-stop-events", "night-stop-south-terminal"],
  ["res-stop-east", "work-stop-east", "work-stop-office", "wealth-stop-hotel", "wealth-stop-south"],
  ["res-stop-home", "res-stop-loop", "work-stop-terminal-b", "night-stop-work-link", "night-stop-clubs"],
].map((stopIds, index) => Object.freeze({
  id: `driving-test-${index + 1}`,
  checkpoints: Object.freeze(stopIds.map((id) => Object.freeze({ id }))),
})));
