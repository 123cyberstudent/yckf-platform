const { withMainActivity, withMainApplication } = require('@expo/config-plugins');

/**
 * withEmergencyShortcut
 * ---------------------
 * Adds an Android-native VOLUME_DOWN key shortcut so a user can trigger an
 * emergency report by pressing the volume-down key quickly.
 *
 * WHY NATIVE IS REQUIRED: React Native / Expo does NOT expose hardware media/
 * volume button presses to the JS runtime. None of the Expo SDK modules expose
 * key events. To deliver a press-based shortcut we intercept
 * `dispatchKeyEvent` in MainActivity and forward KEYCODE_VOLUME_DOWN presses to
 * a small bridge module (EmergencyShortcutModule), which emits a
 * "EmergencyShortcut" DeviceEventEmitter event that JS subscribes to.
 *
 * Because the project uses Expo CNG (android/ is gitignored), all native source
 * we add must be committed as files during prebuild, and registered manually.
 *
 * NOTE: This ONLY works on a native build (APK / dev client) that has run the
 * prebuild with this plugin. It does NOT work inside Expo Go (Expo Go ignores
 * config plugins). Native bridging must be validated on a real device.
 */

const CLASS = 'EmergencyShortcutModule';
const PACKAGE = 'com.yckf.mobile';
const PACKAGE_PATH = 'com/yckf/mobile';

function moduleCode() {
  return `package ${PACKAGE}

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class ${CLASS}(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "${CLASS}"

  @ReactMethod
  fun enable() { enabled = true }

  @ReactMethod
  fun disable() { enabled = false }

  companion object {
    @Volatile private var instance: ${CLASS}? = null
    @Volatile var enabled: Boolean = false

    @JvmStatic
    fun bind(module: ${CLASS}) {
      instance = module
    }

    /** Called from MainActivity on a VOLUME_DOWN key-up event. */
    @JvmStatic
    fun dispatchVolumeDown(timestamp: Long) {
      val mod = instance ?: return
      if (!enabled) return
      val map: WritableMap = Arguments.createMap()
      map.putDouble("timestamp", timestamp.toDouble())
      mod.reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("EmergencyShortcut", map)
    }
  }
}
`;
}

function packageCode() {
  return `package ${PACKAGE}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class EmergencyShortcutPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    val module = ${CLASS}(reactContext)
    ${CLASS}.bind(module)
    return listOf(module)
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`;
}

// Injected into MainActivity — matched to the 2-space-indented Kotlin Expo
// template's class body (safe because RN MainActivity nests at 2 spaces).
function keyOverride() {
  return `
  override fun dispatchKeyEvent(event: android.view.KeyEvent): Boolean {
    if (event.keyCode == android.view.KeyEvent.KEYCODE_VOLUME_DOWN &&
        event.action == android.view.KeyEvent.ACTION_UP) {
      ${PACKAGE}.${CLASS}.dispatchVolumeDown(event.eventTime)
    }
    return super.dispatchKeyEvent(event)
  }
`;
}

function writeSourceFile(basePath, relative, content) {
  const fs = require('fs');
  const path = require('path');
  const full = path.join(basePath, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

module.exports = function withEmergencyShortcut(config) {
  const { withMod } = require('@expo/config-plugins');

  // 1) Commit the native bridge module + package source files at prebuild.
  config = withMod(config, {
    platform: 'android',
    mod: 'dangerous',
    action: (c) => {
      const root = c.modRequest.platformProjectRoot;
      const dir = `app/src/main/java/${PACKAGE_PATH}`;
      writeSourceFile(root, `${dir}/${CLASS}.kt`, moduleCode());
      writeSourceFile(root, `${dir}/EmergencyShortcutPackage.kt`, packageCode());
      return c;
    },
  });

  // 2) Register the package inside MainApplication so the module is created
  //    and bound (needs to sit in the PackageList(...).packages.apply { ... }).
  config = withMainApplication(config, (c) => {
    const { modResults } = c;
    if (typeof modResults.contents !== 'string') return c;
    let contents = modResults.contents;

    if (!contents.includes('EmergencyShortcutPackage')) {
      const anchor = '// Packages that cannot be autolinked yet can be added manually here, for example:';
      if (contents.includes(anchor)) {
        contents = contents.replace(anchor, anchor + `\n          add(com.yckf.mobile.EmergencyShortcutPackage())`);
      } else {
        // Fallback: insert before the closing of the apply { } block.
        const apply = 'PackageList(this).packages.apply {';
        if (contents.includes(apply)) {
          const idx = contents.indexOf(apply) + apply.length;
          contents = contents.slice(0, idx) + `\n        add(com.yckf.mobile.EmergencyShortcutPackage())` + contents.slice(idx);
        }
      }
    }
    return { ...c, modResults: { ...modResults, contents } };
  });

  // 3) Inject the key override into MainActivity.
  config = withMainActivity(config, (c) => {
    const { modResults } = c;
    if (typeof modResults.contents !== 'string') return c;
    let contents = modResults.contents;
    if (contents.includes('dispatchKeyEvent') === false) {
      // Insert right before the final closing brace of the class body.
      const lastBrace = contents.lastIndexOf('}');
      if (lastBrace !== -1) {
        contents = contents.slice(0, lastBrace) + keyOverride() + contents.slice(lastBrace);
      }
    }
    return { ...c, modResults: { ...modResults, contents } };
  });

  return config;
};