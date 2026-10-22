import Phaser from "phaser";
import { dokulariUret } from "../art";

export class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    dokulariUret(this);
    this.scene.start("Menu");
  }
}
