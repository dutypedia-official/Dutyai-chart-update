<script lang="ts">
import { onMount, createEventDispatcher } from 'svelte';
import { persisted } from 'svelte-persisted-store';
import emojiData from 'unicode-emoji-json';

const dispatch = createEventDispatcher();

// Props
let { show = $bindable(false), position = $bindable({ x: 0, y: 0 }) } = $props();

// Recently used emojis store
const recentlyUsed = persisted('emoji-recently-used', [] as string[]);

// Search state
let searchQuery = $state('');
let activeCategory = $state('smileys');

// Process emoji data from unicode-emoji-json
const processEmojiData = () => {
  const categories: Record<string, { name: string; emojis: Array<{ emoji: string; name: string; keywords: string[] }> }> = {
    smileys: { name: 'Smileys & Emotion', emojis: [] },
    people: { name: 'People & Body', emojis: [] },
    animals: { name: 'Animals & Nature', emojis: [] },
    food: { name: 'Food & Drink', emojis: [] },
    activities: { name: 'Activities', emojis: [] },
    travel: { name: 'Travel & Places', emojis: [] },
    objects: { name: 'Objects', emojis: [] },
    symbols: { name: 'Symbols', emojis: [] },
    flags: { name: 'Flags', emojis: [] }
  };

  // Process each emoji from the unicode-emoji-json data
  // The data structure is: { '😀': { name: 'grinning face', group: 'Smileys & Emotion', ... }, ... }
  Object.entries(emojiData).forEach(([emojiChar, emojiData]: [string, any]) => {
    if (!emojiChar || !emojiData.name) return;
    
    const emojiObj = {
      emoji: emojiChar,
      name: emojiData.name,
      keywords: emojiData.keywords || []
    };

    // Categorize emojis based on their group
    const group = emojiData.group?.toLowerCase() || '';
    const name = emojiData.name.toLowerCase();
    
    if (group.includes('smileys') || group.includes('emotion') || name.includes('face') || name.includes('smile') || name.includes('laugh') || name.includes('cry')) {
      categories.smileys.emojis.push(emojiObj);
    } else if (group.includes('people') || group.includes('body') || name.includes('hand') || name.includes('body') || name.includes('person') || name.includes('man') || name.includes('woman')) {
      categories.people.emojis.push(emojiObj);
    } else if (group.includes('animals') || group.includes('nature') || name.includes('animal') || name.includes('cat') || name.includes('dog') || name.includes('bird') || name.includes('plant') || name.includes('tree')) {
      categories.animals.emojis.push(emojiObj);
    } else if (group.includes('food') || group.includes('drink') || name.includes('food') || name.includes('fruit') || name.includes('drink') || name.includes('coffee') || name.includes('pizza')) {
      categories.food.emojis.push(emojiObj);
    } else if (group.includes('activities') || group.includes('sport') || name.includes('sport') || name.includes('ball') || name.includes('game')) {
      categories.activities.emojis.push(emojiObj);
    } else if (group.includes('travel') || group.includes('places') || name.includes('car') || name.includes('plane') || name.includes('train') || name.includes('building')) {
      categories.travel.emojis.push(emojiObj);
    } else if (group.includes('objects') || name.includes('phone') || name.includes('computer') || name.includes('book') || name.includes('tool')) {
      categories.objects.emojis.push(emojiObj);
    } else if (group.includes('flags') || name.includes('flag')) {
      categories.flags.emojis.push(emojiObj);
    } else {
      categories.symbols.emojis.push(emojiObj);
    }
  });

  return categories;
};

const categories = processEmojiData();

// Filter emojis based on search query
const filteredEmojis = $derived(searchQuery 
  ? Object.values(categories).flatMap(cat => cat.emojis).filter(emojiObj => 
      emojiObj.emoji.includes(searchQuery) || 
      emojiObj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emojiObj.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  : categories[activeCategory as keyof typeof categories]?.emojis || []);

// Handle emoji selection
function selectEmoji(emoji: string) {
  // Add to recently used
  recentlyUsed.update(recent => {
    const filtered = recent.filter(e => e !== emoji);
    return [emoji, ...filtered].slice(0, 20); // Keep only 20 recent emojis
  });
  
  // Dispatch selection event
  dispatch('select', { emoji });
  
  // Close picker
  show = false;
}

// Handle category change
function setCategory(category: string) {
  activeCategory = category;
  searchQuery = '';
}

// Handle search input
function handleSearch(event: Event) {
  const target = event.target as HTMLInputElement;
  searchQuery = target.value;
}

// Close picker when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.emoji-picker')) {
    show = false;
  }
}

onMount(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }
});
</script>

{#if show}
<div 
  class="emoji-picker fixed z-50 bg-base-100 border border-base-content/20 rounded-lg shadow-lg"
  style="left: {position.x}px; top: {position.y}px; width: 320px; height: 400px;"
>
  <!-- Header with search -->
  <div class="p-3 border-b border-base-content/20">
    <input
      type="text"
      placeholder="Search emojis..."
      class="input input-sm w-full bg-base-200"
      value={searchQuery}
      oninput={handleSearch}
    />
  </div>

  <!-- Category tabs -->
  {#if !searchQuery}
  <div class="flex border-b border-base-content/20 overflow-x-auto">
    {#if $recentlyUsed.length > 0}
    <button
      class="px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors {activeCategory === 'recent' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'}"
      onclick={() => setCategory('recent')}
    >
      Recent
    </button>
    {/if}
    {#each Object.entries(categories) as [key, category]}
    <button
      class="px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors {activeCategory === key ? 'border-primary text-primary' : 'border-transparent hover:text-primary'}"
      onclick={() => setCategory(key)}
    >
      {category.name}
    </button>
    {/each}
  </div>
  {/if}

  <!-- Emoji grid -->
  <div class="p-2 overflow-y-auto" style="height: calc(100% - 120px);">
    <div class="grid grid-cols-8 gap-1">
      {#if searchQuery}
        {#each filteredEmojis as emojiObj}
        <button
          class="w-8 h-8 flex items-center justify-center text-lg hover:bg-base-200 rounded transition-colors"
          onclick={() => selectEmoji(emojiObj.emoji)}
          title={emojiObj.name}
        >
          {emojiObj.emoji}
        </button>
        {/each}
      {:else if activeCategory === 'recent' && $recentlyUsed.length > 0}
        {#each $recentlyUsed as emoji}
        <button
          class="w-8 h-8 flex items-center justify-center text-lg hover:bg-base-200 rounded transition-colors"
          onclick={() => selectEmoji(emoji)}
          title={emoji}
        >
          {emoji}
        </button>
        {/each}
      {:else}
        {#each filteredEmojis as emojiObj}
        <button
          class="w-8 h-8 flex items-center justify-center text-lg hover:bg-base-200 rounded transition-colors"
          onclick={() => selectEmoji(emojiObj.emoji)}
          title={emojiObj.name}
        >
          {emojiObj.emoji}
        </button>
        {/each}
      {/if}
    </div>
    
    {#if searchQuery && filteredEmojis.length === 0}
    <div class="text-center text-base-content/60 py-8">
      No emojis found
    </div>
    {/if}
  </div>
</div>
{/if}

<style>
.emoji-picker {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>