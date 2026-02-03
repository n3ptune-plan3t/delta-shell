import { config } from "@/options";
import { windows_names } from "@/windows";
import GObject, { getter, property, register, signal } from "ags/gobject";
import app from "ags/gtk4/app";
import GLib from "gi://GLib?version=2.0";
import { bash } from "../lib/utils";
import { timeout } from "ags/time";

const user = await GLib.getenv("USER");

const commands = {
   sleep: "gtklock & sleep 1; loginctl suspend",
   reboot: "loginctl reboot",
   logout: `loginctl terminate-user ${user}`,
   shutdown: "loginctl poweroff",
   lock: "gtklock",
};

@register({ GTypeName: "PowerMenu" })
export default class PowerMenu extends GObject.Object {
   static instance: PowerMenu;

   static get_default() {
      if (!this.instance) this.instance = new PowerMenu();
      return this.instance;
   }

   constructor() {
      super();
   }

   #title = "";
   #label = "";
   #cmd = "";
   #countdown: ReturnType<typeof timeout> | null = null;

   @getter(String)
   get title() {
      return this.#title;
   }

   @getter(String)
   get label() {
      return this.#label;
   }

   @getter(String)
   get cmd() {
      return this.#cmd;
   }

   private cancelCountdown() {
      this.#countdown?.cancel();
      this.#countdown = null;
   }

   async executeCommand() {
      this.cancelCountdown();
      await bash(this.#cmd);
      app.get_window(windows_names.verification)?.hide();
   }

   cancelAction() {
      this.cancelCountdown();
      app.get_window(windows_names.verification)?.hide();
   }

   async action(action: string) {
      [this.#cmd, this.#title, this.#label] = {
         Sleep: [
            commands.sleep,
            "Sleep",
            `${user} will be sleep automatically in 60 seconds`,
         ],
         Reboot: [
            commands.reboot,
            "Reboot",
            "The system will restart automatically in 60 seconds",
         ],
         Logout: [
            commands.logout,
            "Log Out",
            `${user} will be logged out automatically in 60 seconds`,
         ],
         Shutdown: [
            commands.shutdown,
            "Shutdown",
            "The system will shutdown automatically in 60 seconds",
         ],
         Lock: [
            commands.lock,
            "Lock",
            "The desktop will lock automatically in 60 seconds",
         ],
      }[action]!;

      this.notify("cmd");
      this.notify("title");
      this.notify("label");
      app.get_window(windows_names.powermenu)?.hide();
      app.get_window(windows_names.verification)?.show();

      this.cancelCountdown();
      this.#countdown = timeout(60 * 1000, () => {
         this.executeCommand();
      });
   }
}
