import { SMAGEMessage } from "../../../ha_core/index.js";
import { CCRAnchor } from "../../../ha_core/transform/anchor.js";

export function renderAnchors(anchorOrArray: CCRAnchor | SMAGEMessage[]) {
    const arr = Array.isArray(anchorOrArray)
        ? anchorOrArray
        : Object.values(anchorOrArray).filter(Boolean);

    const meta = Array.isArray(anchorOrArray)
        ? null
        : {
              keys: Object.keys(anchorOrArray),
              present: Object.entries(anchorOrArray)
                  .filter(([_, v]) => v !== null)
                  .map(([k]) => k),
              missing: Object.entries(anchorOrArray)
                  .filter(([_, v]) => v === null)
                  .map(([k]) => k),
              count: Object.values(anchorOrArray).filter(Boolean).length,
          };

    return `
        <h2>Anchor Metadata</h2>
        <pre>${JSON.stringify(meta, null, 2)}</pre>

        <h2>Anchor Messages</h2>
        <pre>${JSON.stringify(arr, null, 2)}</pre>
    `;
}
