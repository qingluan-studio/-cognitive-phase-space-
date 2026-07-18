import { KnowledgeUnit, DataPacket } from '../shared/types';

export type IngredientRole = 'base' | 'accent' | 'bridge' | 'finisher' | 'catalyst';

export interface RecipeIngredient {
  unitId: string;
  role: IngredientRole;
  quantity: number;
  preparation: string;
  flavorNotes: string[];
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  cookingTime: number;
  difficulty: number;
  servings: number;
  nutritionFacts: NutritionFacts;
  tags: string[];
}

export interface NutritionFacts {
  knowledgeDensity: number;
  insightCalories: number;
  creativityIndex: number;
  wisdomFiber: number;
  curiosityProtein: number;
}

export interface CompositionResult {
  recipeId: string;
  ingredientsUsed: number;
  flavorHarmony: number;
  nutritionalScore: number;
  presentationScore: number;
  overallRating: number;
}

export interface RecipeBook {
  id: string;
  name: string;
  recipes: Map<string, Recipe>;
  cuisine: string;
  createdAt: number;
}

export interface PairingSuggestion {
  ingredientA: string;
  ingredientB: string;
  compatibility: number;
  reason: string;
}

export class RecipeComposer {
  private _recipeBooks: Map<string, RecipeBook>;
  private _currentBook: string | null;
  private _compositionHistory: CompositionResult[];
  private _ingredientLibrary: Map<string, KnowledgeUnit>;
  private _pairingMatrix: Map<string, Map<string, number>>;
  private _recipeTemplates: Recipe[];

  constructor() {
    this._recipeBooks = new Map();
    this._currentBook = null;
    this._compositionHistory = [];
    this._ingredientLibrary = new Map();
    this._pairingMatrix = new Map();
    this._recipeTemplates = this._createTemplates();
  }

  get bookCount(): number { return this._recipeBooks.size; }
  get currentBook(): string | null { return this._currentBook; }
  get compositionCount(): number { return this._compositionHistory.length; }
  get ingredientCount(): number { return this._ingredientLibrary.size; }

  public createRecipeBook(id: string, name: string, cuisine: string = 'fusion'): void {
    const book: RecipeBook = {
      id,
      name,
      recipes: new Map(),
      cuisine,
      createdAt: Date.now()
    };
    this._recipeBooks.set(id, book);
    if (!this._currentBook) {
      this._currentBook = id;
    }
  }

  public selectRecipeBook(bookId: string): boolean {
    if (this._recipeBooks.has(bookId)) {
      this._currentBook = bookId;
      return true;
    }
    return false;
  }

  public addIngredient(unit: KnowledgeUnit): void {
    this._ingredientLibrary.set(unit.id, unit);
  }

  public registerPairing(ingredientA: string, ingredientB: string, compatibility: number): void {
    if (!this._pairingMatrix.has(ingredientA)) {
      this._pairingMatrix.set(ingredientA, new Map());
    }
    if (!this._pairingMatrix.has(ingredientB)) {
      this._pairingMatrix.set(ingredientB, new Map());
    }
    this._pairingMatrix.get(ingredientA)!.set(ingredientB, compatibility);
    this._pairingMatrix.get(ingredientB)!.set(ingredientA, compatibility);
  }

  public composeRecipe(
    name: string,
    ingredientIds: string[],
    bookId?: string
  ): Recipe {
    const bid = bookId || this._currentBook;
    const ingredients = this._prepareIngredients(ingredientIds);
    const steps = this._generateSteps(ingredients);
    const nutrition = this._calculateNutrition(ingredients);

    const recipe: Recipe = {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: this._generateDescription(name, ingredients),
      ingredients,
      steps,
      cookingTime: this._estimateCookingTime(ingredients),
      difficulty: this._estimateDifficulty(ingredients),
      servings: Math.max(1, Math.floor(ingredients.length / 2)),
      nutritionFacts: nutrition,
      tags: this._generateTags(ingredients)
    };

    if (bid) {
      const book = this._recipeBooks.get(bid);
      if (book) {
        book.recipes.set(recipe.id, recipe);
      }
    }

    return recipe;
  }

  public composeFromTemplate(
    templateIndex: number,
    customIngredients: string[],
    name?: string
  ): Recipe | null {
    if (templateIndex < 0 || templateIndex >= this._recipeTemplates.length) {
      return null;
    }

    const template = this._recipeTemplates[templateIndex];
    const allIngredients = [...template.ingredients];

    for (let i = 0; i < customIngredients.length && i < allIngredients.length; i++) {
      allIngredients[i] = {
        ...allIngredients[i],
        unitId: customIngredients[i]
      };
    }

    const recipe: Recipe = {
      ...template,
      id: `recipe-${Date.now()}`,
      name: name || template.name,
      ingredients: allIngredients
    };

    return recipe;
  }

  public tasteRecipe(recipeId: string, bookId?: string): CompositionResult | null {
    const bid = bookId || this._currentBook;
    const book = bid ? this._recipeBooks.get(bid) : null;
    const recipe = book?.recipes.get(recipeId);
    if (!recipe) return null;

    const flavorHarmony = this._calculateFlavorHarmony(recipe.ingredients);
    const nutritionalScore = this._calculateNutritionalScore(recipe.nutritionFacts);
    const presentationScore = this._calculatePresentationScore(recipe);

    const overallRating = (flavorHarmony * 0.4 + nutritionalScore * 0.3 + presentationScore * 0.3);

    const result: CompositionResult = {
      recipeId,
      ingredientsUsed: recipe.ingredients.length,
      flavorHarmony,
      nutritionalScore,
      presentationScore,
      overallRating
    };

    this._compositionHistory.push(result);
    return result;
  }

  public suggestPairings(ingredientId: string, count: number = 5): PairingSuggestion[] {
    if (!this._ingredientLibrary.has(ingredientId)) return [];

    const suggestions: PairingSuggestion[] = [];

    for (const [otherId, otherUnit] of this._ingredientLibrary) {
      if (otherId === ingredientId) continue;

      let compatibility = this._pairingMatrix.get(ingredientId)?.get(otherId);
      if (compatibility === undefined) {
        compatibility = this._calculateCompatibility(
          this._ingredientLibrary.get(ingredientId)!,
          otherUnit
        );
      }

      suggestions.push({
        ingredientA: ingredientId,
        ingredientB: otherId,
        compatibility,
        reason: this._explainPairing(compatibility)
      });
    }

    return suggestions
      .sort((a, b) => b.compatibility - a.compatibility)
      .slice(0, count);
  }

  public findRecipeByIngredients(ingredientIds: string[], bookId?: string): Recipe[] {
    const bid = bookId || this._currentBook;
    const book = bid ? this._recipeBooks.get(bid) : null;
    if (!book) return [];

    const matching: Recipe[] = [];
    const targetSet = new Set(ingredientIds);

    for (const recipe of book.recipes.values()) {
      const recipeIngredients = new Set(recipe.ingredients.map(i => i.unitId));
      let matches = 0;
      for (const id of targetSet) {
        if (recipeIngredients.has(id)) matches++;
      }
      if (matches >= Math.ceil(ingredientIds.length * 0.5)) {
        matching.push(recipe);
      }
    }

    return matching.sort((a, b) => {
      const aMatch = a.ingredients.filter(i => targetSet.has(i.unitId)).length;
      const bMatch = b.ingredients.filter(i => targetSet.has(i.unitId)).length;
      return bMatch - aMatch;
    });
  }

  public scaleRecipe(recipeId: string, servings: number, bookId?: string): Recipe | null {
    const bid = bookId || this._currentBook;
    const book = bid ? this._recipeBooks.get(bid) : null;
    const recipe = book?.recipes.get(recipeId);
    if (!recipe) return null;

    const scaleFactor = servings / recipe.servings;
    const scaled: Recipe = {
      ...recipe,
      id: `${recipeId}-scaled-${servings}`,
      servings,
      ingredients: recipe.ingredients.map(ing => ({
        ...ing,
        quantity: ing.quantity * scaleFactor
      }))
    };

    return scaled;
  }

  public generateMenu(
    courseCount: number,
    dietaryPreferences: string[] = []
  ): Recipe[] {
    const menu: Recipe[] = [];
    const allRecipes: Recipe[] = [];

    for (const book of this._recipeBooks.values()) {
      for (const recipe of book.recipes.values()) {
        allRecipes.push(recipe);
      }
    }

    const shuffled = [...allRecipes].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(courseCount, shuffled.length); i++) {
      menu.push(shuffled[i]);
    }

    return menu;
  }

  private _prepareIngredients(ingredientIds: string[]): RecipeIngredient[] {
    const roles: IngredientRole[] = ['base', 'accent', 'bridge', 'finisher', 'catalyst'];
    const ingredients: RecipeIngredient[] = [];

    for (let i = 0; i < ingredientIds.length; i++) {
      const id = ingredientIds[i];
      const unit = this._ingredientLibrary.get(id);
      const role = roles[i % roles.length];

      ingredients.push({
        unitId: id,
        role,
        quantity: this._calculateQuantity(unit, role),
        preparation: this._suggestPreparation(role),
        flavorNotes: unit ? this._extractFlavorNotes(unit) : ['neutral']
      });
    }

    return ingredients;
  }

  private _calculateQuantity(unit: KnowledgeUnit | undefined, role: IngredientRole): number {
    const baseQuantities: Record<IngredientRole, number> = {
      base: 200,
      accent: 50,
      bridge: 100,
      finisher: 25,
      catalyst: 10
    };
    const vecLen = unit?.vector?.length || 5;
    return baseQuantities[role] * (0.5 + vecLen * 0.1);
  }

  private _suggestPreparation(role: IngredientRole): string {
    const preparations: Record<IngredientRole, string> = {
      base: 'Slow simmer over low heat, allow flavors to meld',
      accent: 'Finely chop, add at peak moment',
      bridge: 'Emulsify thoroughly, bind all elements',
      finisher: 'Garnish delicately, add last minute',
      catalyst: 'Sprinkle sparingly, transform everything'
    };
    return preparations[role];
  }

  private _extractFlavorNotes(unit: KnowledgeUnit): string[] {
    const notes: string[] = [];
    const content = unit.content.toLowerCase();
    if (content.includes('data') || content.includes('结构')) notes.push('structured');
    if (content.includes('creat') || content.includes('创造')) notes.push('creative');
    if (content.includes('deep') || content.includes('深度')) notes.push('deep');
    if (content.includes('light') || content.includes('轻量')) notes.push('light');
    if (content.includes('complex') || content.includes('复杂')) notes.push('complex');
    if (notes.length === 0) notes.push('balanced');
    return notes;
  }

  private _generateSteps(ingredients: RecipeIngredient[]): string[] {
    const steps: string[] = [];
    steps.push('Gather all ingredients and prepare workspace');

    const bases = ingredients.filter(i => i.role === 'base');
    const accents = ingredients.filter(i => i.role === 'accent');
    const bridges = ingredients.filter(i => i.role === 'bridge');
    const finishers = ingredients.filter(i => i.role === 'finisher');
    const catalysts = ingredients.filter(i => i.role === 'catalyst');

    if (bases.length > 0) {
      steps.push(`Prepare base ingredients: ${bases.map(b => b.unitId).join(', ')}`);
    }
    if (bridges.length > 0) {
      steps.push(`Add bridging elements for cohesion: ${bridges.map(b => b.unitId).join(', ')}`);
    }
    if (catalysts.length > 0) {
      steps.push(`Introduce catalysts to accelerate reaction: ${catalysts.map(c => c.unitId).join(', ')}`);
    }
    if (accents.length > 0) {
      steps.push(`Fold in accent ingredients for depth: ${accents.map(a => a.unitId).join(', ')}`);
    }
    if (finishers.length > 0) {
      steps.push(`Finish with garnishes: ${finishers.map(f => f.unitId).join(', ')}`);
    }

    steps.push('Let rest and allow flavors to integrate');
    steps.push('Plate and serve immediately');

    return steps;
  }

  private _calculateNutrition(ingredients: RecipeIngredient[]): NutritionFacts {
    let knowledgeDensity = 0;
    let insightCalories = 0;
    let creativityIndex = 0;
    let wisdomFiber = 0;
    let curiosityProtein = 0;

    for (const ing of ingredients) {
      const unit = this._ingredientLibrary.get(ing.unitId);
      const vecLen = unit?.vector?.length || 1;
      const factor = ing.quantity / 100;

      knowledgeDensity += vecLen * factor;
      insightCalories += (unit?.content.length || 100) * factor / 10;
      creativityIndex += Math.random() * factor;
      wisdomFiber += (unit?.lineage?.length || 1) * factor;
      curiosityProtein += Math.log1p(vecLen) * factor;
    }

    const n = Math.max(1, ingredients.length);
    return {
      knowledgeDensity: knowledgeDensity / n,
      insightCalories: insightCalories / n,
      creativityIndex: Math.min(1, creativityIndex / n),
      wisdomFiber: wisdomFiber / n,
      curiosityProtein: curiosityProtein / n
    };
  }

  private _estimateCookingTime(ingredients: RecipeIngredient[]): number {
    const baseTime = 15;
    const perIngredient = 5;
    const complexityBonus = ingredients.filter(i => i.role === 'catalyst' || i.role === 'bridge').length * 10;
    return baseTime + ingredients.length * perIngredient + complexityBonus;
  }

  private _estimateDifficulty(ingredients: RecipeIngredient[]): number {
    const roles = new Set(ingredients.map(i => i.role));
    return Math.min(5, 1 + ingredients.length * 0.2 + roles.size * 0.3);
  }

  private _generateTags(ingredients: RecipeIngredient[]): string[] {
    const tags = new Set<string>();
    for (const ing of ingredients) {
      tags.add(ing.role);
      for (const note of ing.flavorNotes) {
        tags.add(note);
      }
    }
    return Array.from(tags);
  }

  private _generateDescription(name: string, ingredients: RecipeIngredient[]): string {
    const uniqueRoles = [...new Set(ingredients.map(i => i.role))];
    return `A ${uniqueRoles.join('-')} composition named "${name}" featuring ${ingredients.length} carefully selected ingredients.`;
  }

  private _calculateFlavorHarmony(ingredients: RecipeIngredient[]): number {
    if (ingredients.length < 2) return 1;

    let harmony = 0;
    let pairs = 0;

    for (let i = 0; i < ingredients.length; i++) {
      for (let j = i + 1; j < ingredients.length; j++) {
        const a = ingredients[i];
        const b = ingredients[j];
        let compat = this._pairingMatrix.get(a.unitId)?.get(b.unitId);
        if (compat === undefined) {
          compat = this._roleCompatibility(a.role, b.role);
        }
        harmony += compat;
        pairs++;
      }
    }

    return harmony / Math.max(1, pairs);
  }

  private _roleCompatibility(a: IngredientRole, b: IngredientRole): number {
    const compatibilities: Record<string, number> = {
      'base-accent': 0.9,
      'base-bridge': 0.95,
      'base-finisher': 0.7,
      'base-catalyst': 0.6,
      'accent-bridge': 0.85,
      'accent-finisher': 0.9,
      'accent-catalyst': 0.75,
      'bridge-finisher': 0.8,
      'bridge-catalyst': 0.85,
      'finisher-catalyst': 0.7
    };
    const key = [a, b].sort().join('-');
    return compatibilities[key] || 0.5;
  }

  private _calculateNutritionalScore(nutrition: NutritionFacts): number {
    const score = (
      nutrition.knowledgeDensity * 0.2 +
      nutrition.insightCalories * 0.1 +
      nutrition.creativityIndex * 0.3 +
      nutrition.wisdomFiber * 0.2 +
      nutrition.curiosityProtein * 0.2
    );
    return Math.min(1, score / 10);
  }

  private _calculatePresentationScore(recipe: Recipe): number {
    let score = 0.5;
    if (recipe.steps.length > 5) score += 0.1;
    if (recipe.ingredients.length >= 5) score += 0.1;
    if (recipe.tags.length > 3) score += 0.1;
    if (recipe.description.length > 50) score += 0.1;
    const uniqueRoles = new Set(recipe.ingredients.map(i => i.role)).size;
    score += uniqueRoles * 0.04;
    return Math.min(1, score);
  }

  private _calculateCompatibility(a: KnowledgeUnit, b: KnowledgeUnit): number {
    const vecA = a.vector || [];
    const vecB = b.vector || [];
    const minLen = Math.min(vecA.length, vecB.length);
    if (minLen === 0) return 0.5;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < minLen; i++) {
      dot += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }

    const similarity = dot / (Math.sqrt(magA) * Math.sqrt(magB) + 0.001);
    return 0.5 + similarity * 0.5;
  }

  private _explainPairing(compatibility: number): string {
    if (compatibility >= 0.9) return 'Exceptional harmony, flavors elevate each other';
    if (compatibility >= 0.75) return 'Excellent pairing, complementary qualities';
    if (compatibility >= 0.6) return 'Good match, work well together';
    if (compatibility >= 0.4) return 'Decent pairing, requires balance';
    return 'Challenging pairing, needs careful handling';
  }

  private _createTemplates(): Recipe[] {
    return [
      {
        id: 'template-1',
        name: 'Classic Knowledge Stew',
        description: 'A hearty base with subtle accents',
        ingredients: [
          { unitId: 'base-1', role: 'base', quantity: 200, preparation: 'Dice finely', flavorNotes: ['earthy'] },
          { unitId: 'base-2', role: 'base', quantity: 150, preparation: 'Slice thin', flavorNotes: ['rich'] },
          { unitId: 'accent-1', role: 'accent', quantity: 50, preparation: 'Mince', flavorNotes: ['bright'] },
          { unitId: 'bridge-1', role: 'bridge', quantity: 100, preparation: 'Whisk', flavorNotes: ['smooth'] }
        ],
        steps: ['Combine bases', 'Add bridge', 'Fold in accents', 'Serve'],
        cookingTime: 45,
        difficulty: 2,
        servings: 4,
        nutritionFacts: {
          knowledgeDensity: 8,
          insightCalories: 150,
          creativityIndex: 0.6,
          wisdomFiber: 3,
          curiosityProtein: 2.5
        },
        tags: ['classic', 'comfort', 'hearty']
      }
    ];
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<CompositionResult> {
    const bookId = packet.metadata.phase;
    if (!this._recipeBooks.has(bookId)) {
      this.createRecipeBook(bookId, `Book-${bookId}`);
    }

    const ingredientIds: string[] = [];
    for (const ku of packet.payload) {
      this.addIngredient(ku);
      ingredientIds.push(ku.id);
    }

    const recipe = this.composeRecipe(`Recipe-${packet.id}`, ingredientIds, bookId);
    const result = this.tasteRecipe(recipe.id, bookId);

    return {
      id: `composed-${packet.id}`,
      payload: result || {
        recipeId: recipe.id,
        ingredientsUsed: recipe.ingredients.length,
        flavorHarmony: 0.5,
        nutritionalScore: 0.5,
        presentationScore: 0.5,
        overallRating: 0.5
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'RecipeComposer']
      }
    };
  }

  public exportRecipeBook(bookId: string): { id: string; name: string; recipes: Recipe[] } | null {
    const book = this._recipeBooks.get(bookId);
    if (!book) return null;
    return {
      id: book.id,
      name: book.name,
      recipes: Array.from(book.recipes.values())
    };
  }

  public reset(): void {
    this._recipeBooks.clear();
    this._currentBook = null;
    this._compositionHistory = [];
    this._ingredientLibrary.clear();
    this._pairingMatrix.clear();
  }
}
