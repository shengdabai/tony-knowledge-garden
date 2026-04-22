import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/profileOrbit.inline"

const ProfileOrbit: QuartzComponent = () => {
  return (
    <div class="profile-orbit">
      <h3>Skills & Focus</h3>
      <canvas id="orbit-canvas"></canvas>
    </div>
  )
}

ProfileOrbit.css = `
.profile-orbit {
  margin: 0.5em 0;
}
.profile-orbit > h3 {
  font-size: 1rem;
  margin: 0 0 0.5em 0;
}
#orbit-canvas {
  width: 100%;
  height: 250px;
  border-radius: 8px;
  border: 1px solid rgba(231,189,87,0.2);
  background: radial-gradient(ellipse at 50% 40%, #0d1a2d 0%, #07111f 100%);
  display: block;
}
`

ProfileOrbit.afterDOMLoaded = script

export default (() => ProfileOrbit) satisfies QuartzComponentConstructor
