export class LatestRequestGate {
  #epoch = 0;

  begin() {
    this.#epoch += 1;
    return this.#epoch;
  }

  invalidate() {
    this.#epoch += 1;
  }

  isCurrent(epoch: number) {
    return epoch === this.#epoch;
  }
}
