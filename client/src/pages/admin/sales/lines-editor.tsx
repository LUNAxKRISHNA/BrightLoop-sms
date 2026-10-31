import { Plus, Trash } from '@phosphor-icons/react';
import { Select, td, th, theadClass } from '../../../components/admin/admin-ui';
import { Button } from '../../../components/ui/button';
import { lineAmounts, linesTotals, makeLine, products, type Line } from '../../../lib/billing';
import { formatMoney } from '../../../lib/portal';

const cellInput =
  'h-8 w-full rounded-md border border-input bg-background px-2 text-right font-mono text-sm focus:border-foreground focus:outline-none';

const optionKey = (productId: string, variantId: string | null) => `${productId}|${variantId ?? ''}`;

/** Editable product lines (product/variant, quantity, unit price) with totals. */
export function LinesEditor({
  value,
  onChange,
  error,
}: {
  value: Line[];
  onChange: (lines: Line[]) => void;
  error?: string;
}) {
  const options = products
    .use()
    .filter((p) => p.active)
    .flatMap((p) => [
      { key: optionKey(p.id, null), label: p.name },
      ...p.variants.map((v) => ({ key: optionKey(p.id, v.id), label: `${p.name} (${v.name})` })),
    ]);
  const totals = linesTotals(value);

  const update = (index: number, line: Line) => onChange(value.map((l, i) => (i === index ? line : l)));

  return (
    <fieldset>
      <div className="flex items-center justify-between">
        <legend className="text-sm font-medium">Lines</legend>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => options[0] && onChange([...value, makeLine(options[0].key.split('|')[0])])}
        >
          <Plus size={14} /> Add line
        </Button>
      </div>
      <div className="mt-2 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className={theadClass}>
            <tr>
              <th className={th}>Product</th>
              <th className={`${th} w-20 text-right`}>Qty</th>
              <th className={`${th} w-32 text-right`}>Unit price</th>
              <th className={`${th} text-right`}>Amount</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {value.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No lines yet.
                </td>
              </tr>
            )}
            {value.map((line, index) => (
              <tr key={index} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <Select
                    aria-label="Product"
                    value={optionKey(line.productId, line.variantId)}
                    onChange={(event) => {
                      const [productId, variantId] = event.target.value.split('|');
                      update(index, makeLine(productId, variantId || null, line.quantity));
                    }}
                  >
                    {!options.some((o) => o.key === optionKey(line.productId, line.variantId)) && (
                      <option value={optionKey(line.productId, line.variantId)}>{line.description}</option>
                    )}
                    {options.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <input
                    aria-label="Quantity"
                    type="number"
                    min={1}
                    className={cellInput}
                    value={line.quantity}
                    onChange={(event) => update(index, { ...line, quantity: Number(event.target.value) })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    aria-label="Unit price"
                    type="number"
                    min={0}
                    step="0.01"
                    className={cellInput}
                    value={line.unitPrice}
                    onChange={(event) => update(index, { ...line, unitPrice: Number(event.target.value) })}
                  />
                </td>
                <td className={`${td} text-right font-mono`}>{formatMoney(lineAmounts(line).total)}</td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    aria-label="Remove line"
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                  >
                    <Trash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="mt-1.5 text-xs text-status-red-fg">{error}</p>}
      <p className="mt-2 text-right text-xs text-muted-foreground">
        Subtotal <span className="font-mono">{formatMoney(totals.subtotal)}</span> · Tax{' '}
        <span className="font-mono">{formatMoney(totals.tax)}</span> · Total{' '}
        <span className="font-mono font-semibold text-foreground">{formatMoney(totals.total)}</span>
      </p>
    </fieldset>
  );
}

/** Read-only lines with subtotal, tax and total. */
export function LinesView({ lines }: { lines: Line[] }) {
  const totals = linesTotals(lines);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead className={theadClass}>
          <tr>
            <th className={th}>Product</th>
            <th className={`${th} text-right`}>Qty</th>
            <th className={`${th} text-right`}>Unit price</th>
            <th className={`${th} text-right`}>Tax</th>
            <th className={`${th} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index} className="border-b border-border">
              <td className={td}>{line.description}</td>
              <td className={`${td} text-right font-mono`}>{line.quantity}</td>
              <td className={`${td} text-right font-mono`}>{formatMoney(line.unitPrice)}</td>
              <td className={`${td} text-right text-muted-foreground`}>{line.taxRate}%</td>
              <td className={`${td} text-right font-mono`}>{formatMoney(lineAmounts(line).discounted)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-mono">
          <tr>
            <td colSpan={4} className="px-5 pt-3 text-right font-sans text-muted-foreground">Subtotal</td>
            <td className="px-5 pt-3 text-right">{formatMoney(totals.subtotal - totals.discount)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="px-5 pt-1 text-right font-sans text-muted-foreground">Tax</td>
            <td className="px-5 pt-1 text-right">{formatMoney(totals.tax)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="px-5 pt-1 pb-4 text-right font-sans font-semibold">Total</td>
            <td className="px-5 pt-1 pb-4 text-right text-base font-semibold">{formatMoney(totals.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Zod-free check used by forms: every line has quantity >= 1 and price >= 0. */
export function linesError(lines: Line[]) {
  if (lines.length === 0) return 'Add at least one line';
  if (lines.some((l) => !(l.quantity >= 1) || !Number.isInteger(l.quantity))) return 'Quantities must be whole numbers of 1 or more';
  if (lines.some((l) => !(l.unitPrice >= 0))) return 'Unit prices cannot be negative';
  return undefined;
}
