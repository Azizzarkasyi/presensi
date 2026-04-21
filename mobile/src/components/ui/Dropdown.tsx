import React, {useMemo, useState} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {theme} from "../../constants/theme";

export interface DropdownOption {
  label: string;
  value: string | number;
  description?: string;
}

interface DropdownProps {
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  value?: string | number | null;
  onChange: (value: string | number) => void;
  containerStyle?: ViewStyle;
  triggerStyle?: ViewStyle;
  triggerTextStyle?: TextStyle;
  menuStyle?: ViewStyle;
  itemStyle?: ViewStyle;
  itemTextStyle?: TextStyle;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  placeholder = "Pilih salah satu",
  options,
  value,
  onChange,
  containerStyle,
  triggerStyle,
  triggerTextStyle,
  menuStyle,
  itemStyle,
  itemTextStyle,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value],
  );

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        activeOpacity={0.8}
        disabled={disabled}
        onPress={() => setOpen(prev => !prev)}
        style={[
          styles.trigger,
          open && styles.triggerOpen,
          disabled && styles.disabled,
          triggerStyle,
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.placeholderText,
            triggerTextStyle,
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.colors.text.secondary}
        />
      </TouchableOpacity>

      {open ? (
        <View style={[styles.menu, menuStyle]}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.length > 0 ? (
              options.map(option => {
                const isSelected = option.value === value;
                return (
                  <TouchableOpacity
                    key={String(option.value)}
                    activeOpacity={0.8}
                    onPress={() => handleSelect(option.value)}
                    style={[
                      styles.item,
                      isSelected && styles.itemSelected,
                      itemStyle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        isSelected && styles.itemTextSelected,
                        itemTextStyle,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text style={styles.itemDescription}>
                        {option.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyText}>Tidak ada data.</Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontFamily: theme.typography.caption.fontFamily,
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs + 2,
    marginLeft: 2,
  },
  trigger: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12 as any,
  },
  triggerOpen: {
    borderColor: theme.colors.primary,
    backgroundColor: "#fff",
    ...theme.shadows.sm,
  },
  triggerText: {
    flex: 1,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  placeholderText: {
    color: theme.colors.text.light,
  },
  menu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    overflow: "hidden",
    maxHeight: 260,
  },
  item: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemSelected: {
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  itemText: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  itemTextSelected: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  itemDescription: {
    fontFamily: theme.typography.small.fontFamily,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  emptyText: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text.secondary,
    fontStyle: "italic",
  },
  disabled: {
    opacity: 0.6,
  },
});
