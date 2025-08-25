class MidiInput {
  constructor(onNotesChange) {
    this.onNotesChange = onNotesChange;
    this.activeMidi = new Set();
    this.sustainActive = false;
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API non supportée par ce navigateur.");
      return;
    }

    try {
      const access = await navigator.requestMIDIAccess();
      for (let input of access.inputs.values()) {
        input.onmidimessage = (msg) => this.handleMIDIMessage(msg);
      }
      console.log("MIDI prêt 🎹");
    } catch (err) {
      console.error("Erreur d'accès MIDI :", err);
    }
  }

  handleMIDIMessage(message) {
    if (!message || !message.data) return;

    const [status, data1, data2] = message.data;
    const command = status & 0xf0;

    // Sustain pedal
    if (command === 0xB0 && data1 === 64) {
      const isDown = data2 >= 64;
      this.sustainActive = isDown;

      if (!isDown) {
        // Purge des notes relâchées
        this.activeMidi = new Set([...this.activeMidi].filter(n => this.isHeld(n)));
        this.emitChange();
      }
      return;
    }

    const note = data1;
    const velocity = data2;

    if (command === 0x90 && velocity > 0) {
      this.activeMidi.add(note);
      this.markHeld(note);
      this.emitChange();
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      this.unmarkHeld(note);
      if (!this.sustainActive) {
        this.activeMidi.delete(note);
        this.emitChange();
      }
    }
  }

  // --- Gestion des notes physiquement maintenues ---
  heldNotes = new Set();
  markHeld(note) { this.heldNotes.add(note); }
  unmarkHeld(note) { this.heldNotes.delete(note); }
  isHeld(note) { return this.heldNotes.has(note); }

  emitChange() {
    if (this.onNotesChange) {
      this.onNotesChange(
        this.getNoteNames(),
        Array.from(this.activeMidi)
      );
    }
  }

  getNoteNames() {
    return Array.from(this.activeMidi).map(n => NOTE_NAMES[n % 12]);
  }
}
