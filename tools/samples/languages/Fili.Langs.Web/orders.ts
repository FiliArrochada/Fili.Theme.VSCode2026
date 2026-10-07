declare function formatMoney(amount: number, currency?: string): string;

/** An order line. @param sku the stock-keeping unit */
export interface Line { sku: string; quantity: number; price?: number }

export enum Status { Open = 1, Shipped, Cancelled }

const SKU = /^[A-Z]{3}-\d{4}$/;

export class OrderGrid<TLine extends Line> {
  private readonly lines: TLine[] = [];
  static count = 0;

  constructor(public status: Status = Status.Open) { OrderGrid.count++; }

  add(line: TLine): this {
    if (!SKU.test(line.sku)) throw new Error(`bad sku ${line.sku}`);
    this.lines.push(line);
    return this;
  }

  get total(): number {
    let sum = 0;
    for (const { quantity, price = 0 } of this.lines) sum += quantity * price;
    return sum > 1e6 ? Math.round(sum) : sum;
  }

  async describe(): Promise<string> {
    return `${this.lines.length} lines, ${formatMoney(this.total)}`;
  }
}
