import app from "ags/gtk4/app"
import { Astal, Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"
import { createComputed, createState, For, createBinding, createEffect, createMemo } from "ags"
import { subprocess } from "ags/process"
import Hyprland from "gi://AstalHyprland?version=0.1"
import Bluetooth from "gi://AstalBluetooth?version=0.1"
import Mpris from "gi://AstalMpris?version=0.1"
import AstalApps from "gi://AstalApps?version=0.1"
import Wireplumber from "gi://AstalWp?version=0.1"
import Applauncher from "./applauncher.tsx"

// MISC
let searchEntry = null 
const display = print
const {FILL, START, END, CENTER} = Gtk.Align
const LogoDirectory = "./images/"
const DEFHEIGHT = 25
const BARHEIGHT = 25

// BLUETOOTH STATES + CONSTANTS
const bluetooth = Bluetooth.get_default() 
const bluetoothAdapter = bluetooth.get_adapter()
// bluetoothAdapter.start_discovery()
const bluetoothDevices = createBinding(bluetooth, "devices")
const sortBluetoothDevices = (a, b) => a.get_name() > b.get_name()
const bluetoothDevicesPaired = createComputed(()=>bluetoothDevices()
  .filter(device => device.paired)
  .sort((a, b) => sortBluetoothDevices(a, b)))
const bluetoothDevicesNotPaired = createComputed(()=>bluetoothDevices()
  .filter(device => !device.paired && device.name)
  .sort((a, b) => sortBluetoothDevices(a, b)))
const bluetoothIsDiscovering = createBinding(bluetoothAdapter, "discovering")
const bluetoothIsPoweredOn = createBinding(bluetoothAdapter, "powered")

// MEDIA PLAYER CONSTANTS 
const mpris = Mpris.get_default()
const mediaList = createBinding(mpris, "players")

// APPS CONSTANTS
const apps = new AstalApps.Apps()

// WIREPLUMBER CONSTANTS

// TIME DISPLAY VARIABLES 
const calendarWidth = 300
const calendarHeight = 250
const timehmsModuleWidth = 100;

// BLUETOOTH DISPLAY VARIABLES 
const bluetoothButtonHeight = BARHEIGHT * 0.7
const bluetoothMenuHeight = DEFHEIGHT * 15
const bluetoothMenuWidth = DEFHEIGHT * 12
const bluetoothDeviceHeight = DEFHEIGHT 
const bluetoothLabelHeight = bluetoothMenuHeight * 0.1
const bluetoothDevicesPairedHeight = bluetoothMenuHeight * 0.3
const bluetoothDevicesNotPairedHeight = bluetoothMenuHeight * 0.6
const bluetoothDevicesPairedWidth = DEFHEIGHT * 12 * 0.9

// WORKSPACES DISPLAY VARIABLES
const BarWorkspaceHeight = BARHEIGHT * 0.8
const DefaultBarWorkspaceWidth = BARHEIGHT * 0.8
const BarWorkspaceSpacing = BARHEIGHT * 0.2
const BarWorkspaceWidth = DefaultBarWorkspaceWidth
const NO_MONITOR = 3

// LAUNCHER BUTTON DISPLAY VARIABLES
const LauncherButtonHeight = BARHEIGHT * 1
const LauncherButtonWidth = BARHEIGHT * 1

// PROGRAM AREA **************

function Time() {
  // const time_ymd = createPoll("", 10000, 
  //   () => Temporal.Now.plainDateISO().toString())
  const time_hms = createPoll("", 1000, 
    () => new Intl.DateTimeFormat(["en-GB"]).format(Temporal.Now.plainTimeISO()))
  app.apply_css(`.time{font-size: ${BARHEIGHT*0.6}px;}`)
  return (
    <menubutton
      valign={CENTER}
      width-request={timehmsModuleWidth}
      class="barButton time">
      <label class="timehms" label={time_hms}/>
      <popover
        class="calendarBg popoverItem"
        margin-bottom={10}
      >
        <Gtk.Calendar 
          margin-top={10}
          margin-bottom={10}
          margin-start={20}
          margin-end={20}
          height-request={calendarHeight} 
          width-request={calendarWidth}/>
      </popover>
    </menubutton>
  )
}

function BluetoothButton() {
  function bluetoothAction(action, msg, errormsg) {
    try {
      if (msg) display(msg)
      action()
    } catch (Error) {
      if (errormsg) display(`Error: ${Error}... ${errormsg}`)
    }
  }
  function trustDevice(device) {
    bluetoothAction(
      ()=>device.set_trusted(true), 
      `Trusting Device`, 
      `Error occurred in trusting device`
    )
  }
  function connectDevice(device) {
    bluetoothAction(
      ()=>device.connect_device(null), 
      `Attempting to connect to device`,
      `Error occurred in connecting device`
    )
  }
  function disconnectDevice(device) {
    bluetoothAction(
      ()=>device.disconnect_device(null), 
      `Attempting to disconnect device`,
      `Error occurred in disconnecting device`
    )
  }
  function pairDevice(device) {
    bluetoothAction(
      ()=>device.pair(), 
      `Pairing Device`, 
      `Error occurred in pairing device`
    )
  }
  function unpairDevice(device) {
    bluetoothAction(
      ()=>bluetoothAdapter.remove_device(device), 
      `Attempting to remove device`,
      `Cannot remove device!`
    )
  }
  function startScanning() {
    bluetoothAction (
      ()=>bluetoothAdapter.start_discovery(), 
      `Starting discovery...`, 
      `Error when starting bluetooth discovery`
    )
  }
  function stopScanning() {
    bluetoothAction (
      ()=>bluetoothAdapter.stop_discovery(),
      `Ending discovery...`,
      `Error when stopping bluetooth discovery`
    )
  }

  function bluetoothPowerOn() {
    bluetoothAction(
      ()=>bluetoothAdapter.set_powered(true),
      `Opening Bluetooth`,
      `Cannot open bluetooth`
    )
  }
  function bluetoothPowerOff() {
    bluetoothAction(
      ()=>bluetoothAdapter.set_powered(false),
      `Closing bluetooth`,
      `Cannot close bluetooth`
    )
  }
  function toggleConnect(device) {
    if (!device.get_connected()) {
      trustDevice(device)
      if (!device.get_paired()) pairDevice(device);
      connectDevice(device);
    } else {
      disconnectDevice(device);
    }
  }
  function toggleScanning(active) {
    if (active) {
      startScanning()
    } else {
      stopScanning()
    }
  }
  function togglePower(active) {
    if (active) {
      if (!bluetoothIsPoweredOn()) {
        bluetoothPowerOn()
      }
    } else {
      if (bluetoothIsPoweredOn()) {
        bluetoothPowerOff()
      }
    }
  }
  function createBluetoothDeviceButton(device, type) {
    const bluetoothDeviceName = (device.get_name()) ? device.get_name() : device.get_address()
    const bluetoothDeviceConnected = createBinding(device, "connected")
    const bluetoothDeviceAddress = device.get_address()
    const bluetoothCSSName = 
        'bluetooth' + 
        Array.from(bluetoothDeviceAddress)
        .filter(c => c != ':')
        .join('')
    createEffect(()=> {
      if (bluetoothDeviceConnected()) {
        app.apply_css(`.${bluetoothCSSName} {
            color: orange;
            text-shadow: 0 0 10px orange;
        }`);
      } else {
        app.apply_css(`.${bluetoothCSSName} {
            color: cyan;
            text-shadow: 0 0 4px cyan;
          }`);
      }
    })
    const unpairButtonVisible = (type === 0)
    const bluetoothNameWidth = (type === 0)? 
      bluetoothDevicesPairedWidth - 2.2 * bluetoothDeviceHeight : bluetoothDevicesPairedWidth
    return (
      <box
        width-request={bluetoothDevicesPairedWidth}
        class="bluetoothDeviceContainer"
      >
        <button 
          visible={unpairButtonVisible}
          width-request={bluetoothDeviceHeight * 2}
          onClicked={()=>unpairDevice(device)}
        >
          <image 
            class="bluetoothUnpairIcon"
            iconName="abrt" 
            pixelSize={bluetoothDeviceHeight * 0.9}
          />
        </button>
        <button
          valign={START}
          class={`bluetoothDeviceLabelContainer `}
          width-request={bluetoothNameWidth}
          height-request={bluetoothDeviceHeight}
          onClicked={()=>toggleConnect(device)}
        >
          <label 
            halign={END} 
            valign={CENTER} 
            margin-end={BARHEIGHT * 0.4}
            class={`bluetoothDeviceLabel ${bluetoothCSSName}`}
            label={bluetoothDeviceName}
            maxWidthChars={15}
            ellipsize={3}
          />
        </button>
      </box>
    )
  }
  function BluetoothPowerLabel() {
    createEffect(()=> {
      if ((bluetoothIsPoweredOn())) {
        app.apply_css(`.bluetoothLabel {
          text-shadow: 2px 0px 10px rgba(5, 255, 255, 0.9);}`)
      } else {
        app.apply_css(`.bluetoothLabel {
          text-shadow: 2px 0px 5px rgba(5, 255, 255, 0.7);}`)
      }
    })
    return (
      <box
        halign={CENTER}
        width-request={bluetoothDevicesPairedWidth}
        margin-top={20}
        class="bluetoothLabelContainer"
        spacing={bluetoothDevicesPairedWidth * 0.2}
      >
        <switch 
          margin-start={bluetoothDevicesPairedWidth * 0.1}
          valign={CENTER}
          active={bluetoothIsPoweredOn}
          onNotifyActive={({active})=>togglePower(active)}
          class="bluetoothSwitch"
        />
        <label 
          height-request={bluetoothLabelHeight}
          class="bluetoothLabel"
          label="Bluetooth"/>
      </box>
    )
  }
  function BluetoothScanning() {
    createEffect(()=> {
      if ((bluetoothIsDiscovering())) {
        app.apply_css(`.bluetoothDiscoveryLabel {
          text-shadow: 2px 0px 10px rgba(5, 255, 255, 0.9);}`)
      } else {
        app.apply_css(`.bluetoothDiscoveryLabel {
          text-shadow: 2px 0px 5px rgba(5, 255, 255, 0.7);}`)
      }
    })
    return (
      <box
        halign={CENTER}
        width-request={bluetoothDevicesPairedWidth}
        height-request={bluetoothLabelHeight}
        class="bluetoothDiscoveryContainer"
        spacing={bluetoothDevicesPairedWidth * 0.2}
        css="border: 2px solid cyan;">
        <label 
          valign={CENTER}
          margin-start={bluetoothDevicesPairedWidth * 0.1}
          label="Discovery" class="bluetoothDiscoveryLabel"/>
        <switch 
          halign={END}
          valign={CENTER}
          active={bluetoothIsDiscovering}
          onNotifyActive={({active})=>toggleScanning(active)}
          class="bluetoothDiscoverableSwitch"
        />
      </box>
    )
  }
  function BluetoothPairedDevicesMenu() {
    return (
      <scrolledwindow
        halign={CENTER}
        valign={CENTER}
        maxContentHeight={bluetoothDevicesPairedHeight}
        propagateNaturalHeight
        width-request={bluetoothDevicesPairedWidth}
        class="bluetoothPairedMenu"
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
        >
          <For each={bluetoothDevicesPaired}>
            {(device, index) => createBluetoothDeviceButton(device, 0)}
          </For>
        </box>
      </scrolledwindow>
    )
  }
  function BluetoothNotPairedDevicesMenu() {
    return (
      <scrolledwindow
        visible={bluetoothIsDiscovering}
        halign={CENTER}
        valign={CENTER}
        maxContentHeight={bluetoothDevicesNotPairedHeight}
        propagateNaturalHeight
        width-request={bluetoothDevicesPairedWidth}
        class="bluetoothNotPairedMenu"
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
        >
          <For each={bluetoothDevicesNotPaired}>
            {(device, index) => createBluetoothDeviceButton(device, 1)}
          </For>
        </box>
      </scrolledwindow>
    )
  }
  createEffect(()=>{
    if (bluetoothIsPoweredOn()) 
      app.apply_css(`.bluetoothButton{
        box-shadow: -0px 0 10px rgba(15, 255, 255, 1), 
              inset 20px 0 30px rgba(88, 255, 197, 1);
        }`)
    else 
      app.apply_css(`.bluetoothButton {
          box-shadow: -0px 0 10px rgba(15, 255, 255, 1), 
                inset 20px 0 30px rgba(99, 197, 255, 1);
          }`)
  })
  return (
    <menubutton
      valign={CENTER}
      halign={CENTER}
    >
      <image
        class="barButton bluetoothButton"
        file={`${LogoDirectory}/bluetooth-57.png`}
        pixelSize={bluetoothButtonHeight}
      />
      <popover>
        <box 
          orientation={Gtk.Orientation.VERTICAL}
          height-request={bluetoothMenuHeight}
          width-request={bluetoothMenuWidth}
          halign={CENTER}
          valign={CENTER}
          class="bluetoothWindow popoverItem"
        >
          <BluetoothPowerLabel />
          <BluetoothScanning />
          <BluetoothPairedDevicesMenu />
          <BluetoothNotPairedDevicesMenu />
        </box>
      </popover>
    </menubutton>
  )
}

function ActivateLauncherButton() {
  return (
    <button
      class="barButton"
      height-request={LauncherButtonHeight}
      width-request={LauncherButtonWidth}
      onClicked={()=>{
        const launcherWindow = app.get_window("launcher")
        if (launcherWindow) {
          if (launcherWindow.visible) {
            launcherWindow.hide()
          } else {
            launcherWindow.show();
          }
        }
        else 
          print(`launcher window not found`)
      }}
    >
      <image 
        file={`${LogoDirectory}/9641947.png`}
        pixelSize={LauncherButtonHeight}
      />
    </button>
  )
}

function Workspaces({range}) {
  const [left, right] = range
  const length = right - left + 1
  const HYPR = Hyprland.get_default()
  const rangedWS = createComputed(()=>{
    const rawHyprWS = createBinding(HYPR, "workspaces")
    const workspaces = Array(length)
    for (let i = 0; i < length; i++) {
      workspaces[i] = [null, i + left]
    }
    for (let i in rawHyprWS()) {
      const wspace = rawHyprWS()[i]
      const wsid = wspace.get_id()
      if (0 <= wsid - left && wsid - left < length)
        workspaces[wsid-left][0] = wspace
    }
    return workspaces
  })
  const selectedWS = createBinding(HYPR, "focused-workspace")
  const WSColor = [
    "rgba(0, 255, 105, 1)", 
    "rgba(75, 255, 255, 1)", 
    "rgba(0, 255, 115, 1)",
    "rgba(0, 255, 255, 0.1)"
  ]

  function safeDispatch(id) {
    try {
      HYPR.dispatch("workspace", `${id}`)
    } catch (error) {
      print(`Already Dispatced..`)
    }
  }
  function WorkspaceButton({wsid, wsCSS, innerColor}) {
    return (
      <button
        halign={CENTER}
        valign={CENTER}
        class={`workspace`}
        css={wsCSS}
        height-request={BarWorkspaceHeight}
        width-request={BarWorkspaceWidth}
        onClicked={()=>safeDispatch(wsid)}
      >
        <box
          css={`
            border-radius: 10000px;
            border: 3px solid ${innerColor};
            `}
        />
      </button>
    )
  }
  app.apply_css(`.workspaceLabel{font-size: ${BARHEIGHT*0.6}px;}`)
  return (
    <box 
      spacing={BarWorkspaceSpacing}
    >
      <For each={rangedWS}>
        {(wsInfo, index) => {
          const [ws, wsid] = wsInfo
          const isSelected = createComputed(()=>
            selectedWS()?wsid===selectedWS().get_id() : false)
          const monitorid = (ws)? ws.get_monitor().id : NO_MONITOR
          const bgcolor = WSColor[monitorid]
          const borderColor = createComputed(()=>
            (isSelected())? "rgba(0, 255, 255, 1)": "rgba(0, 225, 225, 0.9)")
          const wsCSS = createComputed(()=>`
            border: 3px solid ${borderColor()};
            box-shadow: 0 0 10px ${borderColor()};
          `)
          return (
            <WorkspaceButton 
              wsid={wsid}
              wsCSS={wsCSS}
              innerColor={bgcolor}
            />
          )
        }}
      </For>
    </box>
  )
}

function MusicPlayerButton() {
  const MusicButtonHeight = BARHEIGHT * 0.8
  const MediaCtrlHeight = DEFHEIGHT * 2/3
  const MediaCtrlWidth = MediaCtrlHeight * 3
  return (
    <menubutton
      valign={CENTER}
      class="barButton"
      height-request={MusicButtonHeight}
    >
      <box>
        <image 
          valign={CENTER}
          iconName={"media-playback-stopped"}
          pixelSize={MusicButtonHeight}/>
        <For each={mediaList}>
          {(player) => {
            const [mediaApp] = apps.exact_query(player.entry)
            return (
              <image
                visible={!!mediaApp.iconName} 
                iconName={mediaApp?.iconName} 
                pixelSize={MusicButtonHeight}
              />
            )
          }}
        </For>
      </box>
      <popover>
        <box 
          orientation={Gtk.Orientation.VERTICAL}
          class="mediaMenu popoverItem media"
        >
          <For each={mediaList}>
            {(player) => {
              const mediaTitle = createBinding(player, "title")
              const mediaArtist = createBinding(player, "artist")
              const [mediaApp] = apps.exact_query(player.entry)
              return (
                <box
                  margin-start={10}
                  margin-end={10}
                  margin-top={5}
                  margin-bottom={5}
                  class="mediaBlock"
                >
                  <image 
                    margin-start={5}
                    iconName={mediaApp?.iconName} 
                    class="media"
                    pixelSize={50} />
                  <box
                    margin-start={10}
                    orientation={Gtk.Orientation.VERTICAL}
                    margin-end={10}
                    hexpand
                  >
                    <label label={mediaTitle} 
                      class="mediaName media"
                      maxWidthChars={30}
                      ellipsize={3}
                    />
                    <label label={mediaArtist} 
                      class="mediaArtist media"
                      maxWidthChars={30}
                      ellipsize={3}
                      margin-bottom={5}
                    />
                    <box
                      halign={CENTER}
                      spacing={10}
                      margin-bottom={5}
                    >
                      <button 
                        visible={createBinding(player, "canGoPrevious")}
                        class="mediaCtrl media"
                        onClicked={()=>player.previous()}
                      >
                        <image 
                          pixelSize={MediaCtrlHeight} 
                          width-request={MediaCtrlWidth} iconName="media-seek-backward-symbolic"/>
                      </button>

                      <button 
                        class="mediaCtrl media"
                        visible={createBinding(player, "canControl")}
                        onClicked={()=>player.play_pause()}
                      >
                        <box>
                          <image
                            pixelSize={MediaCtrlHeight} 
                            width-request={MediaCtrlWidth}
                            iconName="media-playback-start-symbolic"
                            visible={createBinding(
                              player,
                              "playbackStatus",
                            )((s) => s !== Mpris.PlaybackStatus.PLAYING)}
                          />
                          <image
                            pixelSize={MediaCtrlHeight} 
                            width-request={MediaCtrlWidth}
                            iconName="media-playback-pause-symbolic"
                            visible={createBinding(
                              player,
                              "playbackStatus",
                            )((s) => s === Mpris.PlaybackStatus.PLAYING)}
                          />
                        </box>
                      </button>

                      <button 
                        visible={createBinding(player, "canGoNext")}
                        class="mediaCtrl media"
                        onClicked={()=>player.next()}
                      >
                        <image 
                          pixelSize={MediaCtrlHeight} 
                          width-request={MediaCtrlWidth} iconName="media-seek-forward-symbolic"/>
                      </button>
                    </box>
                  </box>
                </box>
              )
            }}
          </For>
        </box>
      </popover>
    </menubutton>
  )
}

function AudioControlButton() {
  const AudioControlButtonHeight = BARHEIGHT * 0.7
  const AudioMenuWidth = DEFHEIGHT * 12
  const AudioBarWidth = DEFHEIGHT * 11
  const AudioDevicesListHeight = DEFHEIGHT * 10
  const wireplumber = Wireplumber.get_default()
  const speaker = wireplumber.defaultSpeaker
  const audioDevices = createBinding(wireplumber, "devices")
  const volumeIcon = createBinding(speaker, "volumeIcon")
  const audioVolume = createBinding(speaker, "volume")
  const audioNodes = createBinding(wireplumber, "nodes")
  const audios = createBinding(wireplumber, "audio")
  const audioSpeakers = createBinding(audios(), "speakers")
  const audioSinks = createComputed(()=>audioNodes().filter(node => node.mediaClass === Wireplumber.MediaClass.AUDIO_SINK))
  const curSink = createBinding(wireplumber, "default_speaker")
  return (
    <menubutton
      valign={CENTER}
      class="barButton audioButton"
    >
      <image 
        iconName={volumeIcon}
        pixelSize={AudioControlButtonHeight}
      />
      <popover>
        <box 
          class="popoverItem audioMenu"
          width-request={AudioMenuWidth}
        >
          <scrolledwindow
            valign={START}
            height-request={AudioDevicesListHeight}
            maxContentHeight={AudioDevicesListHeight}
            class="audioDevicesMenu"
            propagateNaturalWidth
            margin-start={10}
            margin-end={10}
            margin-top={10}
            margin-bottom={10}
          >
            <box
              valign={START}
              width-request={AudioBarWidth}
              orientation={Gtk.Orientation.VERTICAL}
            >
              <For each={audioSpeakers}>
                {(sink) => {
                  const profile = sink.get_description()
                  const deviceIsDefault = createBinding(sink, "is_default")
                  const deviceId = createBinding(sink, "id")
                  const cssClass = `audio${deviceId()}`
                  createEffect(()=>{
                    if (deviceIsDefault()) {
                      app.apply_css(`.${cssClass} {color: orange; text-shadow: 0 0 10px orange;}`)
                    } else {
                      app.apply_css(`.${cssClass} {color: cyan; text-shadow: 0 0 10px cyan;}`)
                    }
                  })
                  return (
                    <button
                      margin-start={10}
                      margin-end={10}
                      height-request={30}
                      class={`${cssClass} audioDeviceButton`}
                      onClicked={()=>sink.set_is_default(true)}
                    >
                      <label label={profile} maxWidthChars={20} ellipsize={3}/>
                    </button>
                  )
                }}
              </For>
            </box>
          </scrolledwindow>
          <slider
            halign={CENTER}
            onChangeValue={({ value }) => speaker.set_volume( (1 - value) )}
            value={createComputed(()=>(1 - audioVolume()))}
            height-request={AudioDevicesListHeight}
            orientation={Gtk.Orientation.VERTICAL}
          />
        </box>
      </popover>
    </menubutton>
  )
}

export default function Bar(monitor = 0) {
  return (
    <window visible
      monitor={monitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
      keymode={Astal.Keymode.ON_DEMAND}
    >
      <centerbox
        orientation={Gtk.Orientation.HORIZONTAL}
        height-request={BARHEIGHT}
        class="bar"
      >
        <box 
          margin-start={5}
          $type="start"
          orientation={Gtk.Orientation.HORIZONTAL}
        >
          <Time />
        </box>

        <box 
          $type="center"
          orientation={Gtk.Orientation.HORIZONTAL}
        >
          <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={5}
          >
            <Workspaces range={[1,5]}/>
            <ActivateLauncherButton /> 
            <Workspaces range={[6,10]} />
          </box>
        </box>
        <box 
          margin-end={5}
          $type="end"
          orientation={Gtk.Orientation.HORIZONTAL}
          spacing={5}
          valign={CENTER}
        >
          <MusicPlayerButton /> 
          <AudioControlButton />
          <BluetoothButton />
        </box>
      </centerbox>
    </window>
  )
}
