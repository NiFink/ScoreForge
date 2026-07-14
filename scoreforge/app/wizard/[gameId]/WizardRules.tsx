"use client";

import { useI18n } from "@/lib/i18n";

type WizardRulesProps = {
  activeSpecialCardIds: string[];
  onClose: () => void;
};

export function WizardRules({ activeSpecialCardIds, onClose }: WizardRulesProps) {
  const { t } = useI18n();

  const activeSpecialCards = t.wizard.specialCards.filter((card) =>
    activeSpecialCardIds.includes(card.id),
  );

  return (
    <div className="z-50 fixed inset-0 place-items-end sm:place-items-center grid bg-black/75 p-3">
      <div className="bg-[#18262f] shadow-2xl p-5 border border-(--accent)/25 rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <h2 className="font-black text-2xl">{t.wizard.rulesTitle}</h2>
          <button
            onClick={onClose}
            className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-sm"
            type="button"
          >
            X
          </button>
        </div>

        <div className="bg-[#101820] p-4 rounded-lg">
          <h3 className="font-black">{t.wizard.scoringTitle}</h3>
          <ul className="space-y-2 mt-2 text-[#d8d3bd] text-sm list-disc list-inside">
            {t.wizard.scoringRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        <div className="bg-[#101820] mt-3 p-4 rounded-lg">
          <h3 className="font-black">{t.wizard.playTitle}</h3>
          <ul className="space-y-2 mt-2 text-[#d8d3bd] text-sm list-disc list-inside">
            {t.wizard.playRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        <div className="bg-[#101820] mt-3 p-4 rounded-lg">
          <h3 className="font-black">{t.wizard.specialCasesTitle}</h3>
          <ul className="space-y-2 mt-2 text-[#d8d3bd] text-sm list-disc list-inside">
            {t.wizard.specialCases.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        {activeSpecialCards.length > 0 ? (
          <div className="mt-3">
            <h3 className="font-black">{t.wizard.specialCardsTitle}</h3>
            <p className="mt-1 text-[#9fc9d5] text-xs">
              {t.wizard.specialCardsNote}
            </p>

            <div className="space-y-2 mt-3">
              {activeSpecialCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-[#101820] p-3 rounded-lg"
                >
                  <p className="font-bold text-(--accent)">{card.name}</p>
                  <p className="mt-1 text-[#d8d3bd] text-sm">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
