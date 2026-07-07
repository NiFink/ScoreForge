"use client";

import { useI18n } from "@/lib/i18n";

type MeldReferenceProps = {
  onClose: () => void;
};

export function MeldReference({ onClose }: MeldReferenceProps) {
  const { t } = useI18n();

  return (
    <div className="z-50 fixed inset-0 place-items-end sm:place-items-center grid bg-black/75 p-3">
      <div className="bg-[#18262f] shadow-2xl p-5 border border-(--accent)/25 rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <h2 className="font-black text-2xl">{t.binokel.meldReferenceTitle}</h2>
          <button
            onClick={onClose}
            className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-sm"
            type="button"
          >
            X
          </button>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-[#9fc9d5] text-left">
              <th className="py-2 pr-2 font-semibold">
                {t.binokel.meldReferenceTitle}
              </th>
              <th className="py-2 pr-2 font-semibold text-right">
                {t.binokel.meldValue}
              </th>
              <th className="py-2 font-semibold text-right">
                {t.binokel.meldTrumpValue}
              </th>
            </tr>
          </thead>
          <tbody>
            {t.binokel.melds.map((meld) => (
              <tr key={meld.name} className="border-[#f7e7ad]/10 border-t">
                <td className="py-2 pr-2">{meld.name}</td>
                <td className="py-2 pr-2 font-black text-right">
                  {meld.value}
                </td>
                <td className="py-2 font-black text-(--accent) text-right">
                  {meld.trump}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bg-[#101820] mt-5 p-4 rounded-lg">
          <h3 className="font-black">{t.binokel.cardValuesTitle}</h3>
          <p className="mt-2 text-[#d8d3bd] text-sm">{t.binokel.cardValues}</p>
          <p className="mt-1 text-(--accent-2) text-sm">
            {t.binokel.lastTrickValue}
          </p>
        </div>

        <div className="bg-[#101820] mt-3 p-4 rounded-lg">
          <h3 className="font-black">{t.binokel.trumpRulesTitle}</h3>
          <ul className="space-y-2 mt-2 text-[#d8d3bd] text-sm list-disc list-inside">
            {t.binokel.trumpRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
