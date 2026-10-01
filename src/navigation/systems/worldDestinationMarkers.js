const FONT_AWESOME_LOCATION_DOT = "\uf3c5";

function drawMarkerLabel(context, text, x, y, colour) {
  context.save();
  context.font = "900 12px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 4;
  context.strokeStyle = "#101a35";
  context.strokeText(text, x, y);
  context.fillStyle = colour;
  context.fillText(text, x, y);
  context.restore();
}

export function drawMotoEaziWorldMarker(
  context,
  target,
  stage,
  elapsedSeconds = 0,
) {
  if (!target) return;
  const radius = 85;
  const pulse = (Math.sin(elapsedSeconds * 4.5) + 1) / 2;

  context.save();
  context.fillStyle = `rgb(46 139 255 / ${0.16 + pulse * 0.08})`;
  context.fillRect(
    target.x - radius,
    target.y - radius,
    radius * 2,
    radius * 2,
  );
  context.restore();
}

export function drawManualDestinationWorldMarker(
  context,
  target,
  elapsedSeconds = 0,
) {
  if (!target) return;
  const bounce = Math.sin(elapsedSeconds * 4) * 6;
  const markerY = target.y - 30 + bounce;

  context.save();
  context.translate(target.x, markerY);
  context.shadowColor = "rgb(236 54 54 / 70%)";
  context.shadowBlur = 16;
  context.font = '900 58px "Font Awesome 6 Free"';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 7;
  context.strokeStyle = "#101a35";
  context.strokeText(FONT_AWESOME_LOCATION_DOT, 0, 0);
  context.fillStyle = "#ef3f45";
  context.fillText(FONT_AWESOME_LOCATION_DOT, 0, 0);
  context.restore();

  drawMarkerLabel(context, "DESTINATION", target.x, markerY - 54, "#ffdddd");
}
