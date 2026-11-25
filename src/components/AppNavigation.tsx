import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';


const ITEMS = [
  { key: 'summary', href: '/', label: 'Resumen' },
  { key: 'quiz', href: '/quiz', label: 'Quiz' },
  { key: 'history', href: '/history', label: 'Historial' },
] as const;

type AppNavigationProps = {
  active: (typeof ITEMS)[number]['key'];
};

export default function AppNavigation({ active }: AppNavigationProps) {
  return (
    <View style={styles.container}>
      {ITEMS.map((item) => (
        <Link key={item.key} href={item.href} asChild>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active === item.key }}
            style={[styles.item, active === item.key && styles.activeItem]}
          >
            <Text style={[styles.label, active === item.key && styles.activeLabel]}>
              {item.label}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E5E0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    borderRadius: 12,
  },
  activeItem: {
    backgroundColor: '#E2EEE7',
  },
  label: {
    color: '#68756E',
    fontSize: 13,
    fontWeight: '600',
  },
  activeLabel: {
    color: '#285844',
    fontWeight: '700',
  },
});
