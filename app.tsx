import Bar from "./bar.tsx"
import Applauncher from "./applauncher.tsx"
import app from "ags/gtk4/app"
import barSCSS from "./bar.scss"
import launcherSCSS from "./launcher.scss"
app.start({
  main() {
    app.apply_css(barSCSS);
    app.apply_css(launcherSCSS);
    const launcher = Applauncher(1);
    app.add_window(launcher)
    launcher.present()
    const bar = Bar(1);
    app.add_window(bar)
    bar.present()
  },
})

