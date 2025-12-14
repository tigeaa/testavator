/**
 * Web Speech APIを使用して音声合成を行うコントローラー
 */
export class SpeechController {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.loadVoices();
    // ボイスの読み込みは非同期で行われるため、イベントリスナーを設定
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  /**
   * 利用可能なボイスを読み込み、日本語ボイスを優先的に保持します。
   */
  loadVoices() {
    this.voices = this.synth.getVoices();
    console.log('利用可能なボイス:', this.voices);
  }

  /**
   * 指定されたテキストを音声で読み上げます。
   * @param {string} text - 読み上げるテキスト
   * @param {function} onStart - 発話開始時に呼び出されるコールバック
   * @param {function} onEnd - 発話終了時に呼び出されるコールバック
   */
  speak(text, onStart, onEnd) {
    // 既存の発話をキャンセル
    if (this.synth.speaking) {
      console.warn('既存の発話をキャンセルします。');
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // イベントコールバックを設定
    utterance.onstart = onStart;
    utterance.onend = onEnd;
    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      // エラー時にも終了コールバックを呼ぶことで、口の動きを止める
      if (onEnd) {
        onEnd();
      }
    };

    // 日本語の音声を探して設定
    const japaneseVoice = this.voices.find(voice => voice.lang === 'ja-JP');
    if (japaneseVoice) {
      utterance.voice = japaneseVoice;
      utterance.lang = 'ja-JP';
    } else {
      console.warn('日本語のボイスが見つかりませんでした。デフォルトのボイスを使用します。');
    }

    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    this.synth.speak(utterance);
  }

  /**
   * 現在の音声合成を停止します。
   */
  cancel() {
    this.synth.cancel();
  }
}
