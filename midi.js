class MidiInput {
  constructor(onNotesChange) {
    this.onNotesChange = onNotesChange; // callback appelé à chaque changement
    this.activeNotes = new Map();       // Map pour compter les occurrences
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
    const noteName = this.noteNames[note % 12];
    
    if (!noteName) return;

    if (command === 0x90 && velocity > 0) {
      // Note ON - Incrémente le compteur
      this.activeNotes.set(noteName, (this.activeNotes.get(noteName) || 0) + 1);
      this.activeMidi.add(note);
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      // Note OFF - Décrémente le compteur
      const count = this.activeNotes.get(noteName) || 0;
      if (count > 1) {
        this.activeNotes.set(noteName, count - 1);
      } else {
        this.activeNotes.delete(noteName);
      }
      this.activeMidi.delete(note);
    }

    // Appeler le callback avec les notes actuelles
    if (this.onNotesChange) {
      this.onNotesChange(
        Array.from(this.activeNotes.keys()),
        Array.from(this.activeMidi)
      );
    }
  }
}

window.MidiInput = MidiInput;
