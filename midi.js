class MidiManager {
  constructor(onNotesChange) {
    this.onNotesChange = onNotesChange;

    // --- État des notes ---
    this.activeMidi = new Set();   // notes actives (avec sustain)
    this.heldNotes = new Set();    // notes physiquement maintenues
    this.sustainActive = false;    // état de la pédale

    // --- Sortie MIDI ---
    this.output = null;
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API non supportée par ce navigateur.");
      return;
    }

    try {
      const access = await navigator.requestMIDIAccess();

      // Entrées MIDI
      for (let input of access.inputs.values()) {
        input.onmidimessage = (msg) => this.handleMIDIMessage(msg);
      }

      // Sortie MIDI (première trouvée)
      const outputs = Array.from(access.outputs.values());
      if (outputs.length > 0) {
        this.output = outputs[0];
        console.log("Sortie MIDI prête :", this.output.name);
      }

      console.log("MIDI prêt 🎹");
    } catch (err) {
      console.error("Erreur d'accès MIDI :", err);
    }
  }

  // --- GESTION DES MESSAGES ENTRANTS ---
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

  // --- Gestion des notes tenues ---
  markHeld(note) { this.heldNotes.add(note); }
  unmarkHeld(note) { this.heldNotes.delete(note); }
  isHeld(note) { return this.heldNotes.has(note); }

  // --- Callback vers l'app ---
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

  // --- SORTIE MIDI ---
  sendNoteOnPc(pc, velocity = 100, channel = 0) {
    if (!this.output) return;
    const noteNumber = 60 + pc; // PC 0 → C4
    this.output.send([0x90 + channel, noteNumber, velocity]);
  }

  sendNoteOffPc(pc, channel = 0) {
    if (!this.output) return;
    const noteNumber = 60 + pc;
    this.output.send([0x80 + channel, noteNumber, 0]);
  }

  // --- Jouer un triangle complet ---
  playTriangle(triangle, velocity = 100, duration = 500) {
    if (!triangle || !triangle.nodes) return;

    // Note On
    for (const node of triangle.nodes) {
      this.sendNoteOnPc(node.pc, velocity);
    }

    // Note Off après durée
    if (duration > 0) {
      setTimeout(() => {
        for (const node of triangle.nodes) {
          this.sendNoteOffPc(node.pc);
        }
      }, duration);
    }
  }
}
