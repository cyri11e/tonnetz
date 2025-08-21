class MidiInput {
  constructor(onNotesChange) {
    this.onNotesChange = onNotesChange; // callback appelé à chaque changement
    this.activeNotes = new Set();       // noms de notes
    this.activeMidi = new Set();        // numéros MIDI
    this.noteNames = NOTE_NAMES;        // depuis config.js
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
    
    const [status, note, velocity] = message.data;
    const command = status & 0xf0;

    if (command === 0x90 && velocity > 0) {
      // Note ON
      const noteName = this.noteNames[note % 12];
      if (noteName) {
        this.activeNotes.add(noteName);
        this.activeMidi.add(note);
      }
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      // Note OFF
      const noteName = this.noteNames[note % 12];
      if (noteName) {
        this.activeNotes.delete(noteName);
        this.activeMidi.delete(note);
      }
    }

    // Appeler le callback avec les notes actuelles
    if (this.onNotesChange) {
      this.onNotesChange(
        Array.from(this.activeNotes),
        Array.from(this.activeMidi)
      );
    }
  }
}

window.MidiInput = MidiInput;
