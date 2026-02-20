import AstalApps from "gi://AstalApps?version=0.1"
import { Astal, Gtk } from "ags/gtk4"
import { createPoll } from "ags/time" 
import { For, createBinding, createComputed, With, createState, createEffect }from "ags"
import app from "ags/gtk4/app"
import Cava from 'gi://AstalCava?version=0.1'
import Graphine from "gi://Graphine"

let win : Astal.Window
let searchEntry : Gtk.Entry
let winVisible: bool;

const {FILL, START, END, CENTER} = Gtk.Align
const PI = Math.PI
const floor = Math.floor
const random = Math.random
const max = Math.max
const min = Math.min
const sin = Math.sin
const cos = Math.cos
const sign = Math.sign

const iconSize = 36

const apps = new AstalApps.Apps()
const appsListRaw = createBinding(apps, "list")
const [appListChangeRequest, setAppListNeedsChange] = createState(false)
const [isDefaultLauncher, setDefaultLauncher] = createState(true)
const [fuzzyApps, setFuzzyApps] = createState([])
const appButtonList = []
const appsList = createComputed(()=> {
  for (let i in appButtonList) {
    appButtonList[i].btn.hide()
  }
  if (isDefaultLauncher()) {
    return appsListRaw().sort((a, b) => a.frequency < b.frequency)
  } else {
    return fuzzyApps()
  }
})
const [needAppIndexEval, setAppIndexEval] = createState(false)

const [timeVisible, setTimeVisible] = createState(true)
const [audioVisible, setAudioVisible] = createState(false) // editFlag
const [ringExpand, setExpand] = createState(true)

function resetAll() {
  setTimeVisible(false)
  setAudioVisible(false)
}

const centralOuterD = 300
const cmdsz = 48

const [cmdList, _] = createState([
  {
    "name": "close", 
    "onclick": ()=>{win.hide()},
    "iconFile": "./images/871552.png"
  }, 
  {
    "name": "time",
    "onclick": ()=>{
      const vis = timeVisible()
      resetAll(); 
      setTimeVisible(!vis)},
    "iconName": "clock"
  }, 
  {
    "name": "visualizer",
    "onclick": ()=>{
      const vis = audioVisible()
      resetAll(); 
      setAudioVisible(!vis)},
    "iconName": "audacity"
  }
])

function InnerRing({d, sz, color}) {
  const clsName = `innerRing${d}`
  app.apply_css(`
  .${clsName} {
    border-radius: 200000px;
    border: ${sz}px solid ${color};
  }
  .${clsName}:hover {

  }
  .${clsName}:active {

  }
  `)
  return <RingBase cls={`${clsName}`} d={d}/>
}

function OuterRing({d, sz, color}) {
  const clsName = `outerRing${d}`
  app.apply_css(`
  .${clsName} {
    border-radius: 200000px;
    border: 3px solid ${color};
    box-shadow: inset 0 0 20px cyan;
  } 
  .${clsName}:hover {
    border: 3px solid cyan;
    box-shadow: inset 0 0 20px cyan;
  }
  .${clsName}:active {

  }
  `)
  return <RingBase cls={`${clsName}`} d={d}/>
}

function FullRing({d, sz, innerColor, outerColor}) {
  return (
    <overlay
      halign={CENTER}
      valign={CENTER}
      css="border-radius: 10000px;"
    >
      <InnerRing d={d} sz={sz} color={innerColor}/>
      <OuterRing d={d} sz={sz} color={outerColor} $type="overlay"/>
    </overlay>
  )
}

function RingBase({d, cls, dur=300}) {
  return (
    <revealer 
      revealChild={ringExpand}
      valign={CENTER}
      halign={CENTER}
      transitionType={Gtk.RevealerTransitionType.CROSSFADE}
      transitionDuration={dur}
      css="border-radius: 100000px;"
    >
      <box
        class={`${cls}`}
        width-request={d}
        height-request={d}
      />
    </revealer>
  )
}

function App({appl}) {
  function ringNum(idx) {
    if (idx < 8) return 0
    if (idx < 24) return 1 
    if (idx < 48) return 2 
    return 3
  }
  function ringIdx(idx) {
    if (idx < 8) return idx
    if (idx < 24) return idx - 8
    if (idx < 48) return idx - 24
    return idx - 48
  }
  function ringSize(idx) {
    if (idx < 8) return min(8, appsList().length)
    if (idx < 24) return min(16, appsList().length - 8)
    if (idx < 48) return min(24, appsList().length - 24)
    return min(32, appsList().length - 48)
  }
  const index = createComputed(()=>{
    for (let i in appsList()) {
      if (appsList()[i] === appl) return i;
    }
    return -1;
  })
  const iconName = createBinding(appl, "iconName")
  const appFreq = createBinding(appl, "frequency")
  const d = createComputed(()=>ringNum(index())*200 + 500)
  const theta = createComputed(()=>ringIdx(index()) * 2 * PI / ringSize(index()))
  const lbl = createBinding(appl, "name")
  const mt = createComputed(()=>max(0, -d() * sin(theta())))
  const mb = createComputed(()=>max(0, d() * sin(theta())))
  const ml = createComputed(()=>max(0, d() * cos(theta())))
  const mr = createComputed(()=>max(0, -d() * cos(theta())))
  const vis = createComputed(()=>index() != -1 && appl && ringExpand)
  return (
    <button
      $={(btn) => appButtonList.push({"app": appl, "btn": btn})}
      class="appButton"
      onClicked={()=>{
        appl.launch()
      }}
      margin-top={mt}
      margin-bottom={mb}
      margin-start={ml}
      margin-end={mr}
      halign={CENTER}
      valign={CENTER}
      visible={vis}
    > 
      <revealer
        revealChild={ringExpand}
        transitionType={Gtk.RevealerTransitionType.CROSSFADE}
        transitionDuration={200}
      >
        <box orientation={Gtk.Orientation.VERTICAL}>
          <With value={iconName}>
            {(value) => {
              if (value[0] == '/') return (
                <image 
                  $type="overlay" 
                  file={value}
                  pixelSize={iconSize}
                />
              )
              return (
                <image
                  $type="overlay" 
                  iconName={value}
                  pixelSize={iconSize}
                />
              )
            }}
          </With>
          <label class="appName" label={lbl} maxWidthChars={8} ellipsize={3}/>
        </box>
      </revealer>
    </button>
  )
}

function Central() {
  return (
    <button
      halign={CENTER}
      valign={CENTER}
      height-request={300}
      width-request={300}
      class="central"
      onClicked={()=>searchEntry.grab_focus()}
    />
  )
}

function CentralOuterRing() {
  return (
    <button
      halign={CENTER}
      valign={CENTER}
      height-request={400}
      width-request={400}
      class="centralOuter ring"
      onClicked={()=>{setExpand(v=>!v)}}
    />
  )
}

function CmdButton({index}) {
  const d = centralOuterD + cmdsz
  const theta = createComputed(()=>2 * PI * index() / cmdList().length)
  const ml = createComputed(()=>max(0, d * -sin(theta())))
  const mr = createComputed(()=>max(0, d * sin(theta())))
  const mb = createComputed(()=>max(0, d * cos(theta())))
  const mt = createComputed(()=>max(0, d * -cos(theta())))
  const iconName = createComputed(()=>cmdList()[index()].iconName)
  const iconFile = createComputed(()=>cmdList()[index()].iconFile)
  print(`${iconName()} ${iconFile()}`)
  return (
    <button
      halign={CENTER}
      valign={CENTER}
      height-request={cmdsz}
      width-request={cmdsz}
      class="cmdButton"
      onClicked={cmdList()[index()].onclick}
      margin-top={mt}
      margin-bottom={mb}
      margin-start={ml}
      margin-end={mr}
    >
      <revealer
        revealChild
        css="border-radius: 20000px;"
      >
        <With value={iconName}>
          {(value)=> {
            if (value == null) {
              return (
                <image 
                  file={iconFile}
                  pixelSize={cmdsz * 0.8}
                />
              )
            } else {
              return (
                <image 
                  iconName={iconName}
                  pixelSize={cmdsz * 0.8}
                />
              )
            }
          }}
        </With>
      </revealer>
    </button>
  )
}

function CentralTime() {
  const time_hms = createPoll("", 1000, 
    () => new Intl.DateTimeFormat(["en-GB"]).format(Temporal.Now.plainTimeISO()))
  const time_ymd = createPoll("", 1000, 
    () => new Intl.DateTimeFormat(["en-GB"]).format(Temporal.Now.plainDateISO()))
  return (
    <revealer
      margin-bottom={50}
      halign={CENTER}
      valign={CENTER}
      transitionType={Gtk.RevealerTransitionType.CROSSFADE}
      revealChild={timeVisible}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        class="centralTime"
      >
        <label label={time_hms}/>
        <label label={time_ymd}/>
      </box>
    </revealer>
  )
}

function AudioVis() {
  const width = 10
  const gap = 500
  const heightFactor = 100
  const totalCavaBars = 20
  const cavaFrameRate = 60
  const showAudioRepMargin = 50
  const cava = Cava.get_default()
  let defaultAudioBars = []
  for (let i = 0; i < totalCavaBars; i++) {
    let colors = [floor(random()*255), floor(random()*255), floor(random()*255)];
    if (colors[1] > colors[2]) [colors[1], colors[2]] = [colors[2], colors[1]]
    if (colors[0] > colors[1]) [colors[0], colors[1]] = [colors[1], colors[0]]
    if (colors[1] > colors[2]) [colors[1], colors[2]] = [colors[2], colors[1]]
    defaultAudioBars.push(
      {"idx": i, "r": colors[0], 
      "g": colors[1], "b": colors[2]
      })
  }
  function sortAudioBar(a, b) {
    if (a.b != b.b) return a.b < b.b 
    if (a.g != b.g) return a.g < b.g 
    return a.r < b.r
  }
  defaultAudioBars.sort((a, b)=>sortAudioBar(a, b))
  const audioValues = createPoll("", 1000/cavaFrameRate, ()=>cava.get_values())
  const [audioBars, setAudioBars] = createState(defaultAudioBars)
  const overlayOffset = totalCavaBars * width
  return (
    <revealer
      halign={CENTER}
      valign={CENTER}
      revealChild={audioVisible}
      transitionType={Gtk.RevealerTransitionType.CROSSFADE}
      height-request={heightFactor * 1.5}
      margin-bottom={showAudioRepMargin}
    >
      <overlay
        margin-end={overlayOffset}
      >
        <For each={audioBars}>
          {(bar, index) => {
            const height = createComputed(()=>audioValues()[index()]*heightFactor)
            const heightFloat = createComputed(()=>height() / 2)
            let lm = max(0, (index() - totalCavaBars / 2) * width)
            const rm = max(0, (totalCavaBars / 2 - index()) * width)
            lm = index() * width
            const theta = index() * PI / totalCavaBars
            return (
              <box
                orientation={Gtk.Orientation.HORIZONTAL}
                halign={START}
                valign={END}
                $type="overlay"
                margin-end={rm}
                margin-start={lm}
                width-request={width}
                height-request={height}
                margin-bottom={heightFloat}
                css={
                  `
                  border: 1px solid cyan;
                  background-color: rgba(${bar.r}, ${bar.g}, ${bar.b}, 0.6);
                  `
                }
              />
            )
          }}
        </For>
      </overlay>
    </revealer>
  )
}

function SearchModule() {
  return (
    <box
      margin-top={145}
      halign={CENTER}
      valign={CENTER}
      class="searchBox"
    >
      <Gtk.SearchEntry
        margin-top={5}
        margin-bottom={5}
        margin-start={10}
        margin-end={10}
        xalign={0.5}
        $={(ref) => (searchEntry = ref)}
        onNotifyText={({text})=>{
          setAppIndexEval(true)
          if (text == "") setDefaultLauncher(true)
          else {
            setDefaultLauncher(false)
            setFuzzyApps(apps.fuzzy_query(text))
          }
        }}
      />
    </box>
  )
}

function Launcher() {
  return (
    <overlay>
      <FullRing d={600+600} sz={100} innerColor={"rgba(11, 22, 44, 0.5)"} outerColor={"rgba(0, 177, 255, 1)"} $type="overlay"/>
      <FullRing d={600+400} sz={100} innerColor={"rgba(11, 22, 44, 0.5)"} outerColor={"rgba(0, 199, 255, 1)"} $type="overlay"/>
      <FullRing d={600+200} sz={100} innerColor={"rgba(11, 22, 44, 0.5)"} outerColor={"rgba(0, 211, 255, 1)"} $type="overlay"/>
      <FullRing d={600+000} sz={100} innerColor={"rgba(11, 22, 44, 0.5)"} outerColor={"rgba(0, 233, 255, 1)"} $type="overlay"/>
      <For each={appsList}>
        {(appl, index) => 
          <App appl={appl} index={index} $type="overlay"/>
        }
      </For>
      <CentralOuterRing $type="overlay"/>
      <For each={cmdList}>
        {(cmd, index)=>
          <CmdButton index={index} $type="overlay"/>
        }
      </For>
      <CentralTime $type="overlay" />
      <AudioVis $type="overlay" />
      <Central $type="overlay"/>
      <SearchModule $type="overlay" />
    </overlay>
  )
}

export default function appLauncher(monitor = 0) {
  return (
    <window
      $={(ref)=>(win=ref)}
      visible
      name="launcher"
      monitor={monitor}
      anchor={Astal.WindowAnchor.CENTER}
      keymode={Astal.Keymode.ON_DEMAND}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      width-request={1200}
      height-request={1200}
    >
      <Launcher />
    </window>
  )
}
