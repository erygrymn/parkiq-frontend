import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '../localization';
import type { Tariff, TariffType } from '../lib/tariffMath';
import { useSettingsStore } from '../state/settingsStore';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { ChipGroup, type ChipOption } from './ChipGroup';
import { TieredTariffEditor } from './TieredTariffEditor';
import { Overline } from './Typography';

// §7.4'ün ilk dilimi: hourly + flat manuel giriş. Tam dilimli (tiered) form ve
// OCR akışı sonraki tuğla — screens.md §4'te işaretli değiller henüz.

type FormMode = 'none' | TariffType;

export function TariffForm({
  value,
  onChange,
}: {
  value: Tariff | null;
  onChange: (tariff: Tariff | null) => void;
}) {
  const { colors } = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const [mode, setMode] = useState<FormMode>(value?.type ?? 'none');
  const [amount, setAmount] = useState(value?.price != null ? String(value.price) : '');

  const apply = (nextMode: FormMode, nextAmount: string) => {
    // tiered kendi editöründen yayınlar; burada yalnız tek-tutarlı modlar işlenir.
    if (nextMode === 'tiered') return;
    const parsed = Number(nextAmount.replace(',', '.'));
    if (nextMode === 'none' || !Number.isFinite(parsed) || parsed <= 0) {
      onChange(null);
      return;
    }
    if (nextMode === 'hourly') onChange({ type: 'hourly', currency, price: parsed });
    if (nextMode === 'flat') onChange({ type: 'flat', currency, price: parsed });
  };

  const options: ChipOption<FormMode>[] = [
    { key: 'none', label: t('tariffNone') },
    { key: 'hourly', label: t('tariffHourly') },
    { key: 'flat', label: t('tariffFlat') },
    { key: 'tiered', label: t('tariffTiered') },
  ];

  return (
    <View style={{ gap: spacing.s8 }}>
      <Overline>{t('tariff')}</Overline>
      <ChipGroup
        options={options}
        value={mode}
        onChange={(next) => {
          setMode(next);
          apply(next, amount);
        }}
      />

      {mode === 'tiered' && (
        <TieredTariffEditor
          initialTiers={value?.type === 'tiered' ? value.tiers : undefined}
          onChange={(tiers) => onChange(tiers.length > 0 ? { type: 'tiered', currency, tiers } : null)}
        />
      )}

      {(mode === 'hourly' || mode === 'flat') && (
        <BottomSheetTextInput
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            apply(mode, text);
          }}
          keyboardType="decimal-pad"
          placeholder={mode === 'hourly' ? t('amountPerHour') : t('flatAmount')}
          placeholderTextColor={colors.textSecondary}
          style={{
            height: 44,
            borderRadius: radius.r12,
            backgroundColor: colors.inset,
            paddingHorizontal: spacing.s12,
            fontSize: 15,
            color: colors.ink,
            fontVariant: ['tabular-nums'],
          }}
        />
      )}
    </View>
  );
}
