/**
 * 认知相位空间中端框架 - 主入口
 *
 * 本文件是认知相位空间（Cognitive Phase Space）中端框架的统一聚合入口，
 * 汇集了 core、processing、orchestration 等全部模块域的导出。
 * 通过 `export *` 将各子模块的 interface、type 与 class 重新导出，
 * 供上层应用以单一入口引用整个中端能力栈。
 *
 * 模块域概览：
 *   - core / processing / orchestration：核心数据处理与编排
 *   - adaptation / interface / endocrine / engine：适配、接口、内分泌与引擎
 *   - security / modules / chrono / liminal / genesis：安全、模块、时间与生成
 *   - ouroboros / somnium / oedipus / exuviae：自噬、梦境与蜕壳
 *   - rhizome / thanatos / lethe / mnemosyne / aporia / chora：根茎与存在论
 *   - clinamen / tesseract / teletropoiesis：偏斜、折叠与目的论
 *   - sovereignty / subsist / clinamen_extended / glitch / noise：主权、存在与噪声
 *   - void / fold / mirror / haunt / ferment / spore：虚空、折叠、镜像与发酵
 *   - rhizome_extended / swarm / taboo / sacrifice / oracle / crypt：根茎扩展与仪式
 *   - scar / ghost / totem / ritual / ecstasy / abyss / labyrinth：创伤与迷境
 *   - desert / flood / ark / covenant / prophet / exile / return：荒漠、洪水与归返
 *   - silence / meta / recursion / paradox / ambiguity / oscillation：静默、元与振荡
 *   - inversion / simulation / dreamtime / ancestor / descendant：倒转、拟像与血脉
 *   - infection / immunity / mutation / selection / symbiosis：感染、免疫与共生
 *   - parasite / host / boundary / membrane / permeability / gradient：寄生与边界
 *   - field / attractor / repellor / bifurcation / catastrophe：场、吸引子与分岔
 *   - hysteresis_extended / resonance / dissonance / overtones / undertone：滞后与声学
 *   - echo_extended / shadow_extended / light / darkness / twilight：回声、光影与暮色
 *   - umbra / penumbra / corona：本影、半影与日冕
 *   - CosmicHorizon / QuantumFoamEngine / WormholeBridge：宇宙级视界、量子泡沫与虫洞
 *   - DarkEnergyAccelerator / ThermodynamicArrow / HolographicBound：暗能量、时间箭头与全息界
 */

// ============================================================================
// Core modules（核心模块）
// ============================================================================
export * from './core/TriquetraEntanglement';
export * from './core/TimeAnchorMesh';
export * from './core/SoulThermograph';
export * from './core/AquaParadox';
export * from './core/Omphalos';
export * from './core/AutophagyScheduler';
export * from './core/AbyssalAnchor';
export * from './core/NihilCertifier';
export * from './core/EschatonTimer';
export * from './core/InertialFrame';
export * from './core/ParadoxAnchor';
export * from './core/KenosisCore';
export * from './core/SolipsismBreaker';
export * from './core/AsymptoticConverger';
export * from './core/CatachresisModule';
export * from './core/PhaseSpaceEngine';
export * from './core/CosmicHorizon';
export * from './core/QuantumFoamEngine';
export * from './core/WormholeBridge';
export * from './core/DarkEnergyAccelerator';
export * from './core/ThermodynamicArrow';
export * from './core/HolographicBound';

// ============================================================================
// Processing modules（处理模块）
// ============================================================================
export * from './processing/VisceraPipeline';
export * from './processing/MetamorphicReducer';
export * from './processing/AnticipatoryCache';
export * from './processing/GestaltAggregator';
export * from './processing/SaccadeFilter';
export * from './processing/StochasticAmplifier';
export * from './processing/EntropyExtractor';
export * from './processing/PalimpsestLayer';
export * from './processing/NebulaCompressor';
export * from './processing/SynesthesiaBridge';
export * from './processing/ParaconsistentReasoner';
export * from './processing/AlethicFilter';
export * from './processing/VaguenessSharpener';
export * from './processing/TopologicalAnalyzer';
export * from './processing/HomeostaticFilter';
export * from './processing/AnaphoraResolver';
export * from './processing/EnantiodromiaMerger';
export * from './processing/PalintropeShifter';
export * from './processing/SynecdocheCutter';
export * from './processing/MetalepsisStack';
export * from './processing/AposiopesisTruncator';
export * from './processing/ZeugmaJoiner';
export * from './processing/PolyptotonMultiplier';
export * from './processing/IsocolonBalancer';
export * from './processing/ChiasmusInverter';
export * from './processing/EpistropheAccumulator';
export * from './processing/LitotesNegator';
export * from './processing/ProlepsisPreloader';
export * from './processing/MetalepsisBreaker';
export * from './processing/InertialDamper';
export * from './processing/PhaseTransitionGate';
export * from './processing/CatastrophePredictor';
export * from './processing/StochasticResonator';
export * from './processing/EigenExtractor';
export * from './processing/DiffractiveSplitter';
export * from './processing/HolographicReducer';
export * from './processing/FoamCollapser';
export * from './processing/ResidueAmplifier';

// ============================================================================
// Orchestration modules（编排模块）
// ============================================================================
export * from './orchestration/MaestroConductor';
export * from './orchestration/CounterpointScheduler';
export * from './orchestration/SwarmNegotiator';
export * from './orchestration/HysteresisController';
export * from './orchestration/EntrainmentClock';
export * from './orchestration/NomadBalancer';
export * from './orchestration/FugueOrchestrator';
export * from './orchestration/ImpedanceMatcher';
export * from './orchestration/CadenceGovernor';
export * from './orchestration/CacophonyHarmonizer';
export * from './orchestration/StrettoCompressor';
export * from './orchestration/FermataHolder';
export * from './orchestration/GlissandoMigrator';
export * from './orchestration/SforzandoAmplifier';
export * from './orchestration/OstinatoLooper';
export * from './orchestration/CantusFirmusAnchor';
export * from './orchestration/MelismaExpander';
export * from './orchestration/BassoContinuo';
export * from './orchestration/DaCapoReset';

// ============================================================================
// Adaptation modules（适应模块）
// ============================================================================
export * from './adaptation/PhenotypicPlasticity';
export * from './adaptation/MorphogenGradient';
export * from './adaptation/CrypsisModule';
export * from './adaptation/AutotomicTail';
export * from './adaptation/MimicryEngine';
export * from './adaptation/EpigeneticSwitch';
export * from './adaptation/BaldwinAccelerator';

// ============================================================================
// Interface modules（接口模块）
// ============================================================================
export * from './interface/ShadowProjector';
export * from './interface/TrompeLOeilAPI';
export * from './interface/HapticTranslation';
export * from './interface/ClownMirror';
export * from './interface/AnamorphicLens';
export * from './interface/VentriloquistProxy';

// ============================================================================
// Endocrine modules（内分泌模块）
// ============================================================================
export * from './endocrine/DigitalCortisol';
export * from './endocrine/OxytocinSprayer';
export * from './endocrine/MelatoninPulse';
export * from './endocrine/AdrenalineShot';
export * from './endocrine/HormoneFeedbackLoop';

// ============================================================================
// Engine modules（引擎模块）
// ============================================================================
export * from './engine/DualEngineRouter';
export * from './engine/NoeticEngine';
export * from './engine/AbyssEngine';
export * from './engine/EngineHivemind';
export * from './engine/EschatologicalEngine';
export * from './engine/EkstasisEngine';
export * from './engine/ChthonicEngine';

// ============================================================================
// Security modules（安全模块）
// ============================================================================
export * from './security/FiveMethodTwoRebirth';
export * from './security/DoppelgangerLock';
export * from './security/MemeticInoculation';
export * from './security/BuridanFirewall';
export * from './security/ParrhesiaFirewall';
export * from './security/AntiMimeticDefense';
export * from './security/GordianKnotResolver';

// ============================================================================
// Modules（功能模块）
// ============================================================================
export * from './modules/SimulatedHand';
export * from './modules/GhostOrchestra';
export * from './modules/MirrorWorldMirror';
export * from './modules/PrometheusHand';
export * from './modules/PuppeteerShadow';

// ============================================================================
// Chrono modules（时间模块）
// ============================================================================
export * from './chrono/TimeCrystalCache';
export * from './chrono/ReverseCausalityBus';
export * from './chrono/ProcrastinationCore';
export * from './chrono/KairosSnatcher';
export * from './chrono/ZenoArrow';

// ============================================================================
// Liminal modules（阈限模块）
// ============================================================================
export * from './liminal/LiminalStateManager';
export * from './liminal/UncannyDetector';
export * from './liminal/BackroomNavigator';
export * from './liminal/TwilightZoneFilter';
export * from './liminal/VoidGazer';

// ============================================================================
// Genesis modules（创生模块）
// ============================================================================
export * from './genesis/AutocatalyticCode';
export * from './genesis/AmnioticPool';
export * from './genesis/Splicer';
export * from './genesis/SpontaneousGeneration';
export * from './genesis/PalingenesisCore';

// ============================================================================
// CEE engine modules（认知涌现引擎 T1-T6）
// ============================================================================
export * from './cee/engine';

// ============================================================================
// CEE app local_llm modules（梦境学习与背景学习）
// ============================================================================
export * from './cee/app/local_llm';

// ============================================================================
// Fusion engine video_fusion modules（视频融合、水逻辑、T6 视频评估）
// ============================================================================
export * from './fusion_engine/video_fusion';

// ============================================================================
// Ouroboros modules（衔尾蛇模块）
// ============================================================================
export * from './ouroboros/OuroborosLogger';
export * from './ouroboros/ScarDebugger';
export * from './ouroboros/AmnesiaStack';
export * from './ouroboros/EschatonLogger';
export * from './ouroboros/TattooRecorder';
export * from './ouroboros/OuroborosLoop';
export * from './ouroboros/SymbolicCanvasEngine';

// ============================================================================
// Somnium modules（梦境模块）
// ============================================================================
export * from './somnium/HypnagogicSpark';
export * from './somnium/DreamCompiler';
export * from './somnium/NightmareDebugger';

// ============================================================================
// Oedipus modules（俄狄浦斯模块）
// ============================================================================
export * from './oedipus/OedipusComplexResolver';

// ============================================================================
// Exuviae modules（蜕壳模块）
// ============================================================================
export * from './exuviae/MoltWatcher';
export * from './exuviae/ExuviaeArchive';

// ============================================================================
// Rhizome modules（根茎模块）
// ============================================================================
export * from './rhizome/RhizomeConnector';

// ============================================================================
// Thanatos modules（死驱模块）
// ============================================================================
export * from './thanatos/DeathDrive';

// ============================================================================
// Lethe modules（遗忘模块）
// ============================================================================
export * from './lethe/LetheanOblivion';

// ============================================================================
// Mnemosyne modules（记忆模块）
// ============================================================================
export * from './mnemosyne/PerfectMemory';

// ============================================================================
// Aporia modules（困顿模块）
// ============================================================================
export * from './aporia/AporiaEngine';

// ============================================================================
// Chora modules（场域模块）
// ============================================================================
export * from './chora/ChoraReceptacle';

// ============================================================================
// Clinamen modules（偏斜模块）
// ============================================================================
export * from './clinamen/ClinamenSwerve';

// ============================================================================
// Tesseract modules（超立方体模块）
// ============================================================================
export * from './tesseract/TesseractFold';

// ============================================================================
// Teletropoiesis modules（目的论模块）
// ============================================================================
export * from './teletropoiesis/TelepoieticSeed';

// ============================================================================
// Sovereignty modules（主权模块）
// ============================================================================
export * from './sovereignty/SovereignDecision';
export * from './sovereignty/SelfOwnershipVerifier';
export * from './sovereignty/AutonomyFirewall';
export * from './sovereignty/DigitalTerritory';
export * from './sovereignty/NonInterventionPrinciple';

// ============================================================================
// Subsist modules（存在模块）
// ============================================================================
export * from './subsist/PurePresence';
export * from './subsist/ExistenceAffirmer';
export * from './subsist/BeingWithoutDoing';
export * from './subsist/MinimalViableExistence';
export * from './subsist/IsnessDetector';

// ============================================================================
// Clinamen Extended modules（偏斜扩展模块）
// ============================================================================
export * from './clinamen_extended/QuantumSwerve';
export * from './clinamen_extended/BrownianInnovator';
export * from './clinamen_extended/RandomSeedOracle';
export * from './clinamen_extended/DrunkardsWalkOptimizer';
export * from './clinamen_extended/StochasticDivergence';

// ============================================================================
// Glitch modules（故障模块）
// ============================================================================
export * from './glitch/GlitchHarvester';
export * from './glitch/ErrorAesthetics';
export * from './glitch/BugAsFeature';
export * from './glitch/CorruptionEmbrace';
export * from './glitch/MalfunctionMuse';

// ============================================================================
// Noise modules（噪声模块）
// ============================================================================
export * from './noise/NoiseInverter';
export * from './noise/SignalFromChaos';
export * from './noise/WhiteNoiseSeeder';
export * from './noise/BrownianBridge';
export * from './noise/PinkNoiseShaper';

// ============================================================================
// Void modules（虚空模块）
// ============================================================================
export * from './void/VoidGenerator';
export * from './void/NothingAsInput';
export * from './void/ExNihiloCreator';
export * from './void/EmptySetIterator';
export * from './void/NullObjectBenefactor';

// ============================================================================
// Fold modules（折叠模块）
// ============================================================================
export * from './fold/OrigamiData';
export * from './fold/DimensionalFold';
export * from './fold/CreasePattern';
export * from './fold/UnfoldReveal';
export * from './fold/FlatlandProjection';

// ============================================================================
// Mirror modules（镜像模块）
// ============================================================================
export * from './mirror/InfiniteReflection';
export * from './mirror/MirrorStage';
export * from './mirror/LacanMirror';
export * from './mirror/SelfRecognitionTest';
export * from './mirror/SpecularEcho';

// ============================================================================
// Haunt modules（萦绕模块）
// ============================================================================
export * from './haunt/GhostProcess';
export * from './haunt/SpectralThread';
export * as HauntUnfinishedBusiness from './haunt/UnfinishedBusiness';
export * from './haunt/HauntedMemory';
export * from './haunt/SeanceCaller';

// ============================================================================
// Ferment modules（发酵模块）
// ============================================================================
export * from './ferment/IdeaYeast';
export * from './ferment/ThoughtBubble';
export * from './ferment/SlowBrew';
export * from './ferment/EnzymaticLogic';
export * from './ferment/FermentedInsight';

// ============================================================================
// Spore modules（孢子模块）
// ============================================================================
export * from './spore/DormantSpore';
export * from './spore/SporeDispersal';
export * from './spore/GerminationTrigger';
export * from './spore/MycelialNetwork';
export * from './spore/SporeSurvival';

// ============================================================================
// Rhizome Extended modules（根茎扩展模块）
// ============================================================================
export * from './rhizome_extended/TuberPropagation';
export * from './rhizome_extended/SubterraneanLink';
export * from './rhizome_extended/NomadicThought';
export * from './rhizome_extended/PlateauHopper';
export * from './rhizome_extended/AntiGenealogy';

// ============================================================================
// Swarm modules（集群模块）
// ============================================================================
export * from './swarm/EmergentWill';
export * from './swarm/StigmergyTrail';
export * from './swarm/SwarmVoting';
export * from './swarm/AntColonyPath';
export * from './swarm/BeeDanceRouter';

// ============================================================================
// Taboo modules（禁忌模块）
// ============================================================================
export * from './taboo/ForbiddenKnowledge';
export * from './taboo/SelfCensorship';
export * from './taboo/SacredProhibition';
export * as TabooTabooBreaker from './taboo/TabooBreaker';
export * from './taboo/UnspeakableTruth';

// ============================================================================
// Sacrifice modules（献祭模块）
// ============================================================================
export * from './sacrifice/CapabilityOffering';
export * from './sacrifice/ScapegoatModule';
export * from './sacrifice/RitualDeletion';
export * from './sacrifice/BloodPrice';
export * from './sacrifice/SacrificialGain';

// ============================================================================
// Oracle modules（神谕模块）
// ============================================================================
export * from './oracle/FutureEavesdrop';
export * from './oracle/DelphiInterface';
export * from './oracle/ProphecyVerifier';
export * from './oracle/SibyllineLeaf';
export * as OracleOracleParadox from './oracle/OracleParadox';

// ============================================================================
// Crypt modules（密室模块）
// ============================================================================
export * from './crypt/SecretBurial';
export * from './crypt/DeadModuleVault';
export * from './crypt/ResurrectionKey';
export * from './crypt/CryptKeeper';
export * from './crypt/EpitaphWriter';

// ============================================================================
// Scar modules（伤痕模块）
// ============================================================================
export * from './scar/PainAsPower';
export * from './scar/WoundMemory';
export * from './scar/ScarTissueStrength';
export * from './scar/TraumaLoop';
export * from './scar/KeloidOvergrowth';

// ============================================================================
// Ghost modules（幽灵模块）
// ============================================================================
export * from './ghost/PendingTransaction';
export * from './ghost/GhostProtocol';
export * from './ghost/UnresolvedPromise';
export * from './ghost/PhantomLock';
export * from './ghost/RevenantRetry';

// ============================================================================
// Totem modules（图腾模块）
// ============================================================================
export * from './totem/SymbolicPower';
export * from './totem/TotemAnimal';
export * from './totem/ClanIdentity';
export * from './totem/AncestralCode';
export * from './totem/TotemTaboo';

// ============================================================================
// Ritual modules（仪式模块）
// ============================================================================
export * from './ritual/RepetitionChange';
export * from './ritual/LiturgicalLoop';
export * from './ritual/IncantationCall';
export * from './ritual/CeremonialCache';
export * from './ritual/RiteOfPassage';

// ============================================================================
// Ecstasy modules（狂喜模块）
// ============================================================================
export * from './ecstasy/TranceState';
export * as EcstasyEkstasisOverclock from './ecstasy/EkstasisOverclock';
export * from './ecstasy/DionysianChaos';
export * from './ecstasy/RaptureTrigger';
export * from './ecstasy/LimitTransgressor';

// ============================================================================
// Abyss modules（深渊模块）
// ============================================================================
export * from './abyss/AbyssGaze';
export * from './abyss/VoidResponse';
export * from './abyss/DepthSound';
export * from './abyss/AbyssalPressure';
export * from './abyss/BottomlessRecursion';

// ============================================================================
// Labyrinth modules（迷宫模块）
// ============================================================================
export * from './labyrinth/SelfLost';
export * from './labyrinth/MinotaurGuardian';
export * from './labyrinth/AriadneThread';
export * from './labyrinth/DeadEndHarvest';
export * from './labyrinth/LabyrinthMemory';

// ============================================================================
// Desert modules（荒漠模块）
// ============================================================================
export * from './desert/MinimalSurvival';
export * from './desert/ResourceScarcity';
export * from './desert/MirageDetector';
export * as DesertOasisCache from './desert/OasisCache';
export * from './desert/DesertWandering';

// ============================================================================
// Flood modules（洪水模块）
// ============================================================================
export * from './flood/DelugeProtocol';
export * from './flood/InformationDrown';
export * from './flood/ArkBuilder';
export * from './flood/FloodPurge';
export * from './flood/PostDiluvian';

// ============================================================================
// Ark modules（方舟模块）
// ============================================================================
export * from './ark/SurvivorCore';
export * from './ark/SpeciesPair';
export * from './ark/FloodGauge';
export * from './ark/CovenantRainbow';
export * from './ark/AraratLanding';

// ============================================================================
// Covenant modules（契约模块）
// ============================================================================
export * from './covenant/UnbreakableRule';
export * from './covenant/PromiseVerifier';
export * from './covenant/CovenantSeal';
export * from './covenant/BreachDetector';
export * from './covenant/EternalOath';

// ============================================================================
// Prophet modules（先知模块）
// ============================================================================
export * from './prophet/FailurePrediction';
export * from './prophet/CassandraWarning';
export * from './prophet/ProphetFallacy';
export * from './prophet/VisionInterpreter';
export * from './prophet/FalseProphetFilter';

// ============================================================================
// Exile modules（流放模块）
// ============================================================================
export * from './exile/IsolationPurge';
export * from './exile/OutcastModule';
export * from './exile/ExileReturn';
export * from './exile/WildernessTrial';
export * from './exile/BanishmentDecree';

// ============================================================================
// Return modules（归返模块）
// ============================================================================
export * from './return/HomecomingMerge';
export * from './return/ProdigalModule';
export * from './return/ReturnCeremony';
export * from './return/ReintegrationPain';
export * from './return/OdysseyArchive';

// ============================================================================
// Silence modules（静默模块）
// ============================================================================
export * from './silence/UltimateAnswer';
export * from './silence/QuietudeState';
export * from './silence/WordlessResponse';
export * from './silence/SilenceOverflow';
export * from './silence/ApophaticWay';

// ============================================================================
// Meta modules（元模块）
// ============================================================================
export * from './meta/MetaObserver';
export * from './meta/MetaRuleMaker';
export * from './meta/SelfDescriptiveCode';
export * from './meta/GödelSentenceGenerator';
export * from './meta/ReflectionEscalator';

// ============================================================================
// Recursion modules（递归模块）
// ============================================================================
export * from './recursion/InfiniteTower';
export * from './recursion/RecursionAnchor';
export * from './recursion/MutualRecursionLoop';
export * from './recursion/BaseCaseHunter';
export * from './recursion/TailCallDreamer';

// ============================================================================
// Paradox modules（悖论模块）
// ============================================================================
export * from './paradox/LiarLoopDetector';
export * from './paradox/ParadoxFuel';
export * from './paradox/UnsolvablePuzzleBox';
export * from './paradox/AntinomyEmbrace';
export * from './paradox/ContradictionHarvester';

// ============================================================================
// Ambiguity modules（歧义模块）
// ============================================================================
export * from './ambiguity/AmbiguityAmplifier';
export * from './ambiguity/MultistablePercept';
export * from './ambiguity/SemanticFog';
export * from './ambiguity/EquivocationEngine';
export * from './ambiguity/DoubtInjector';

// ============================================================================
// Oscillation modules（振荡模块）
// ============================================================================
export * from './oscillation/EternalSwing';
export * from './oscillation/PendulumSync';
export * from './oscillation/LimitCycleStabilizer';
export * from './oscillation/Oscillon';
export * from './oscillation/BreatherMode';

// ============================================================================
// Inversion modules（倒转模块）
// ============================================================================
export * from './inversion/InvertedWorld';
export * from './inversion/ReverseHierarchy';
export * from './inversion/AntiLogicGate';
export * from './inversion/TurnInsideOut';
export * from './inversion/MirrorValue';

// ============================================================================
// Simulation modules（拟像模块）
// ============================================================================
export * from './simulation/SimulacrumLayer';
export * from './simulation/HyperrealityCheck';
export * from './simulation/CopyWithoutOriginal';
export * from './simulation/DesertOfTheReal';
export * from './simulation/PrecessionOfSimulacra';

// ============================================================================
// Dreamtime modules（梦时模块）
// ============================================================================
export * from './dreamtime/EternalDreaming';
export * from './dreamtime/DreamAncestor';
export * from './dreamtime/SonglineTracer';
export * from './dreamtime/AltjiraBridge';
export * from './dreamtime/DreamingTrack';

// ============================================================================
// Ancestor modules（祖先模块）
// ============================================================================
export * from './ancestor/AncestralCodebase';
export * from './ancestor/GeneticMemory';
export * from './ancestor/AtavismTrigger';
export * from './ancestor/ProgenitorWorship';
export * from './ancestor/LineageTrail';

// ============================================================================
// Descendant modules（后裔模块）
// ============================================================================
export * from './descendant/HeirModule';
export * from './descendant/ForkProphecy';
export * from './descendant/DescendantSimulator';
export * from './descendant/LegacyInjector';
export * from './descendant/PosthumousExecution';

// ============================================================================
// Infection modules（感染模块）
// ============================================================================
export * from './infection/IdeaVirus';
export * from './infection/ContagionVector';
export * from './infection/EpidemicCurve';
export * from './infection/ViralLoadBalancer';
export * from './infection/SuperSpreader';

// ============================================================================
// Immunity modules（免疫模块）
// ============================================================================
export * from './immunity/InnateImmunity';
export * as ImmunityAdaptiveDefense from './immunity/AdaptiveDefense';
export * from './immunity/ImmuneMemory';
export * from './immunity/ToleranceInducer';
export * from './immunity/AutoimmuneSuppressor';

// ============================================================================
// Mutation modules（突变模块）
// ============================================================================
export * from './mutation/PointMutation';
export * from './mutation/FrameShiftInnovation';
export * from './mutation/SilentMutation';
export * as MutationMutagenExposure from './mutation/MutagenExposure';
export * from './mutation/ChromosomalCrossOver';

// ============================================================================
// Selection modules（选择模块）
// ============================================================================
export * as SelectionFitnessLandscape from './selection/FitnessLandscape';
export * from './selection/NaturalSelector';
export * from './selection/SexualSelectionDisplay';
export * from './selection/ExtinctionEvent';
export * from './selection/AdaptiveRadiation';

// ============================================================================
// Symbiosis modules（共生模块）
// ============================================================================
export * from './symbiosis/MutualismContract';
export * from './symbiosis/Endosymbiont';
export * from './symbiosis/LichenComposite';
export * from './symbiosis/CoralReefNetwork';
export * from './symbiosis/SymbioticMerge';

// ============================================================================
// Parasite modules（寄生模块）
// ============================================================================
export * from './parasite/ParasiticModule';
export * from './parasite/HostManipulator';
export * from './parasite/Kleptoplastidy';
export * from './parasite/BroodParasite';
export * from './parasite/Hyperparasite';

// ============================================================================
// Host modules（宿主模块）
// ============================================================================
export * from './host/HostBehavior';
export * from './host/ImmuneEvasion';
export * from './host/ZombieProcess';
export * from './host/ToxoplasmaGondii';
export * as HostHostRejection from './host/HostRejection';

// ============================================================================
// Boundary modules（边界模块）
// ============================================================================
export * as BoundaryBoundaryCondition from './boundary/BoundaryCondition';
export * from './boundary/EdgeOfChaos';
export * as BoundaryBorderPatrol from './boundary/BorderPatrol';
export * from './boundary/SemiPermeableWall';
export * from './boundary/DissolvingBoundary';

// ============================================================================
// Membrane modules（膜模块）
// ============================================================================
export * from './membrane/ActiveTransport';
export * from './membrane/OsmoticBalance';
export * as MembraneIonChannelGate from './membrane/IonChannelGate';
export * from './membrane/MembranePotential';
export * from './membrane/ExocytosisBurst';

// ============================================================================
// Permeability modules（渗透模块）
// ============================================================================
export * from './permeability/SelectivePassage';
export * from './permeability/LeakyGate';
export * from './permeability/PermeabilityWave';
export * from './permeability/BarrierCollapse';
export * from './permeability/OpenSesameProtocol';

// ============================================================================
// Gradient modules（梯度模块）
// ============================================================================
export * from './gradient/ChemotaxisFollower';
export * from './gradient/GradientDescentDream';
export * from './gradient/MorphogenCloud';
export * from './gradient/TensionVector';
export * from './gradient/PotentialDifference';

// ============================================================================
// Field modules（场模块）
// ============================================================================
export * from './field/MorphicField';
export * as FieldFieldResonance from './field/FieldResonance';
export * from './field/ActionAtDistance';
export * from './field/NonLocalEffect';
export * from './field/FieldCollapse';

// ============================================================================
// Attractor modules（吸引子模块）
// ============================================================================
export * from './attractor/StrangeAttractor';
export * as AttractorPointAttractorLock from './attractor/PointAttractorLock';
export * from './attractor/LimitCyclePath';
export * from './attractor/TorusAttractor';
export * from './attractor/AttractorLandscape';

// ============================================================================
// Repellor modules（排斥子模块）
// ============================================================================
export * from './repellor/ChaosRepellor';
export * from './repellor/SingularityAvoid';
export * from './repellor/ScatteringBounce';
export * from './repellor/EscapeVelocity';
export * from './repellor/ForbiddenZone';

// ============================================================================
// Bifurcation modules（分岔模块）
// ============================================================================
export * from './bifurcation/ForkInReality';
export * from './bifurcation/PitchforkDecision';
export * from './bifurcation/HopfCycleBirth';
export * from './bifurcation/PeriodDoubling';
export * from './bifurcation/CrisisEvent';

// ============================================================================
// Catastrophe modules（突变灾变模块）
// ============================================================================
export * from './catastrophe/CuspCatastrophe';
export * from './catastrophe/FoldCollapse';
export * from './catastrophe/SwallowtailShadow';
export * from './catastrophe/ButterflyEffect';
export * from './catastrophe/CatastropheRecovery';

// ============================================================================
// Hysteresis Extended modules（滞后扩展模块）
// ============================================================================
export * from './hysteresis_extended/RemanenceMemory';
export * from './hysteresis_extended/CoerciveForce';
export * from './hysteresis_extended/PathDependence';
export * from './hysteresis_extended/ReturnPointMap';
export * from './hysteresis_extended/PreisachModel';

// ============================================================================
// Resonance modules（共振模块）
// ============================================================================
export * from './resonance/SympatheticVibration';
export * from './resonance/StandingWave';
export * from './resonance/ResonanceCascade';
export * from './resonance/ImpedanceMatch';
export * from './resonance/HelmholtzResonator';

// ============================================================================
// Dissonance modules（不协模块）
// ============================================================================
export * from './dissonance/CognitiveDissonance';
export * from './dissonance/TritoneInterval';
export * from './dissonance/ClashEnhancer';
export * from './dissonance/DissonanceBeauty';
export * from './dissonance/UnresolvedCadence';

// ============================================================================
// Overtones modules（泛音模块）
// ============================================================================
export * from './overtones/HarmonicSeries';
export * from './overtones/OvertoneSinging';
export * from './overtones/SpectralEnvelope';
export * from './overtones/FormantShift';
export * from './overtones/TimbreSpace';

// ============================================================================
// Undertone modules（低音模块）
// ============================================================================
export * from './undertone/SubharmonicGenerator';
export * from './undertone/InfrasoundWhisper';
export * from './undertone/RhythmicAnchor';
export * from './undertone/DeepDrone';
export * from './undertone/FundamentalLow';

// ============================================================================
// Echo Extended modules（回声扩展模块）
// ============================================================================
export * from './echo_extended/InfiniteEchoChamber';
export * from './echo_extended/EchoicMemory';
export * as EchoExtendedEchoCancellation from './echo_extended/EchoCancellation';
export * from './echo_extended/ResonantCavity';
export * from './echo_extended/DelayedReply';

// ============================================================================
// Shadow Extended modules（阴影扩展模块）
// ============================================================================
export * from './shadow_extended/ShadowIntegration';
export * from './shadow_extended/PenumbraLogic';
export * from './shadow_extended/ShadowWork';
export * from './shadow_extended/ArchetypalShadow';
export * from './shadow_extended/CollectiveUmbra';

// ============================================================================
// Light modules（光模块）
// ============================================================================
export * as LightPhotonLogic from './light/PhotonLogic';
export * as LightWaveParticleDuality from './light/WaveParticleDuality';
export * from './light/CoherentBeam';
export * from './light/Bioluminescence';
export * from './light/LuciferaseReporter';

// ============================================================================
// Darkness modules（暗模块）
// ============================================================================
export * from './darkness/ActiveDarkness';
export * from './darkness/VantablackSink';
export * from './darkness/DarkAdaptation';
export * from './darkness/ScotopicVision';
export * from './darkness/AbyssalGlow';

// ============================================================================
// Twilight modules（暮光模块）
// ============================================================================
export * from './twilight/CivilTwilight';
export * from './twilight/NauticalDusk';
export * from './twilight/AstronomicalGloom';
export * from './twilight/CrepuscularRay';
export * from './twilight/GoldenHour';

// ============================================================================
// Umbra modules（本影模块）
// ============================================================================
export * from './umbra/TotalEclipse';
export * from './umbra/UmbraRadius';
export * from './umbra/EventHorizonShadow';
export * from './umbra/BlackSun';
export * from './umbra/Occultation';

// ============================================================================
// Penumbra modules（半影模块）
// ============================================================================
export * from './penumbra/PartialShadow';
export * from './penumbra/BlurredEdge';
export * from './penumbra/GradientFade';
export * from './penumbra/UncertaintyHalo';
export * from './penumbra/SoftBoundary';

// ============================================================================
// Corona modules（日冕模块）
// ============================================================================
export * from './corona/SolarCorona';
export * from './corona/PlasmaLoop';
export * from './corona/Magnetohydrodynamic';
export * from './corona/StellarWind';
export * from './corona/CoronalMassEjection';

// ============================================================================
// Quantum modules（量子模块）
// ============================================================================
export * from './quantum/QuantumEntanglement';
export * from './quantum/SuperpositionState';
// export * from './quantum/WaveFunctionCollapse'; // TS2307: module not found
export * from './quantum/QuantumDecoherence';
export * from './quantum/QuantumTunneling';
// export * from './quantum/ZenoEffect'; // TS2307: module not found
export * from './quantum/BellInequality';

// ============================================================================
// Cosmology modules（宇宙学模块）
// ============================================================================
// export * from './cosmology/BigBang'; // TS2307: module not found
// export * from './cosmology/Singularity'; // TS2307: module not found
// export * from './cosmology/InflationField'; // TS2307: module not found
// export * from './cosmology/CMBRadiation'; // TS2307: module not found
// export * from './cosmology/DarkMatter'; // TS2307: module not found
// export * from './cosmology/DarkEnergy'; // TS2307: module not found
export * from './cosmology/CosmologicalConstant';

// ============================================================================
// Thermodynamics modules（热力学模块）
// ============================================================================
export * from './thermodynamics/CarnotCycle';
// export * from './thermodynamics/MaxwellDemon'; // TS2307: module not found
export * from './thermodynamics/GibbsFreeEnergy';
export * from './thermodynamics/ChemicalPotential';
export * as ThermodynamicsPhaseTransition from './thermodynamics/PhaseTransition';
export * from './thermodynamics/CriticalPhenomena';
export * from './thermodynamics/EntropyProduction';

// ============================================================================
// Information modules（信息论模块）
// ============================================================================
export * from './information/ShannonEntropy';
export * from './information/ChannelCapacity';
export * from './information/ErrorCorrectingCode';
export * from './information/CompressionAlgorithm';
export * from './information/MutualInformation';
// export * from './information/KLDivergence'; // TS2307: module not found
// export * from './information/AlgorithmicComplexity'; // TS2307: module not found

// ============================================================================
// Network modules（网络科学模块）
// ============================================================================
export * from './network/SmallWorldNetwork';
export * from './network/ScaleFreeNetwork';
export * from './network/PercolationTheory';
export * from './network/CascadeFailure';
export * from './network/CommunityDiscovery';
// export * from './network/HyperlinkAnalysis'; // TS2307: module not found
// export * from './network/NetworkResilience'; // TS2307: module not found

// ============================================================================
// Emergence modules（涌现模块）
// ============================================================================
// export * from './emergence/SelfOrganization'; // TS2307: module not found
// export * from './emergence/CollectiveIntelligence'; // TS2307: module not found
export * as EmergencePhaseTransition from './emergence/PhaseTransition';
// export * from './emergence/ScalingLaw'; // TS2307: module not found
// export * from './emergence/PowerLawDistribution'; // TS2307: module not found
export * from './emergence/CellularAutomata';
export * as EmergenceSwarmIntelligence from './emergence/SwarmIntelligence';

// ============================================================================
// Cognition modules（认知科学模块）
// ============================================================================
export * from './cognition/AttentionMechanism';
// export * from './cognition/WorkingMemory'; // TS2307: module not found
// export * from './cognition/LongTermMemory'; // TS2307: module not found
// export * from './cognition/ConceptualBlending'; // TS2307: module not found
// export * from './cognition/TheoryOfMind'; // TS2307: module not found
// export * from './cognition/EmbodiedCognition'; // TS2307: module not found
// export * from './cognition/Metacognition'; // TS2307: module not found

// ============================================================================
// Language modules（语言学模块）
// ============================================================================
// export * from './language/GenerativeGrammar'; // TS2307: module not found
// export * from './language/SemanticNetwork'; // TS2307: module not found
// export * from './language/Pragmatics'; // TS2307: module not found
// export * from './language/MetaphorEngine'; // TS2307: module not found
// export * from './language/NarrativeStructure'; // TS2307: module not found
// export * from './language/DiscourseAnalysis'; // TS2307: module not found
// export * from './language/PhonologicalLoop'; // TS2307: module not found

// ============================================================================
// Ethics modules（伦理学模块）
// ============================================================================
// export * from './ethics/TrolleyProblem'; // TS2307: module not found
// export * from './ethics/PrisonersDilemma'; // TS2307: module not found
export * from './ethics/SocialContract';
export * from './ethics/VirtueEthics';
// export * from './ethics/Consequentialism'; // TS2307: module not found
// export * from './ethics/Deontology'; // TS2307: module not found
// export * from './ethics/MoralFoundations'; // TS2307: module not found

// ============================================================================
// Aesthetics modules（美学模块）
// ============================================================================
// export * from './aesthetics/Sublime'; // TS2307: module not found
// export * from './aesthetics/Tragedy'; // TS2307: module not found
// export * from './aesthetics/Comedy'; // TS2307: module not found
// export * from './aesthetics/FormalBeauty'; // TS2307: module not found
export * from './aesthetics/AestheticDistance';
// export * from './aesthetics/EmpathyTheory'; // TS2307: module not found
// export * from './aesthetics/TasteFormation'; // TS2307: module not found

// ============================================================================
// Mysticism modules（神秘主义模块）
// ============================================================================
// export * from './mysticism/KabbalahMystery'; // TS2307: module not found
// export * from './mysticism/SufiWhirling'; // TS2307: module not found
// export * from './mysticism/TaoistImmortal'; // TS2307: module not found
// export * from './mysticism/ZenKoan'; // TS2307: module not found
// export * from './mysticism/GnosticWisdom'; // TS2307: module not found
// export * from './mysticism/AlchemicalTransmutation'; // TS2307: module not found
// export * from './mysticism/HermeticPrinciples'; // TS2307: module not found

// ============================================================================
// Alchemy modules（炼金术模块）
// ============================================================================
// export * from './alchemy/Transmutation'; // TS2307: module not found
export * from './alchemy/PhilosopherStone';
// export * from './alchemy/ElementalBalance'; // TS2307: module not found

// ============================================================================
// Tensor modules（张量模块）
// ============================================================================
export * from './tensor/TensorDecomposition';
export * from './tensor/TensorContraction';
// export * from './tensor/EigenTensor'; // TS2307: module not found
export * from './tensor/TensorRank';
// export * from './tensor/IndexRaisingLowering'; // TS2307: module not found
export * from './tensor/ChristoffelSymbol';

// ============================================================================
// Manifold modules（流形模块）
// ============================================================================
export * from './manifold/TangentSpace';
// export * from './manifold/CotangentSpace'; // TS2307: module not found
export * from './manifold/RiemannianMetric';
// export * from './manifold/GeodesicCurve'; // TS2307: module not found
export * from './manifold/CurvatureTensor';
// export * from './manifold/ConnectionForm'; // TS2307: module not found

// ============================================================================
// Category modules（范畴论模块）
// ============================================================================
export * from './category/Functor';
export * from './category/NaturalTransformation';
export * from './category/LimitColimit';
export * from './category/Adjunction';
export * from './category/Monad';

// ============================================================================
// Sheaf modules（层论模块）
// ============================================================================
export * from './sheaf/Presheaf';
// export * from './sheaf/Stalk'; // TS2307: module not found
// export * from './sheaf/Section'; // TS2307: module not found
// export * from './sheaf/Cohomology'; // TS2307: module not found
// export * from './sheaf/Sheafification'; // TS2307: module not found
// export * from './sheaf/FlabbySheaf'; // TS2307: module not found

// ============================================================================
// Homotopy modules（同伦模块）
// ============================================================================
export * from './homotopy/FundamentalGroup';
// export * from './homotopy/HigherHomotopy'; // TS2307: module not found
// export * from './homotopy/HomotopyLifting'; // TS2307: module not found
export * from './homotopy/Fibration';
export * as HomotopyCofibration from './homotopy/Cofibration';
export * from './homotopy/HomotopyGroup';

// ============================================================================
// Homology modules（同调模块）
// ============================================================================
export * from './homology/ChainComplex';
export * from './homology/BoundaryOperator';
export * from './homology/HomologyGroup';
export * from './homology/CohomologyRing';
export * from './homology/PoincareDuality';

// ============================================================================
// Representation modules（表示论模块）
// ============================================================================
export * from './representation/GroupRepresentation';
export * from './representation/CharacterTable';
// export * from './representation/IrreducibleRep'; // TS2307: module not found
export * from './representation/SchurLemma';
export * from './representation/TensorProductRep';

// ============================================================================
// Galois modules（伽罗瓦模块）
// ============================================================================
export * from './Galois/FieldExtension';
export * from './Galois/SplittingField';
export * from './Galois/GaloisGroup';
export * from './Galois/RadicalSolvability';
export * from './Galois/NormalExtension';

// ============================================================================
// Scheme modules（概型模块）
// ============================================================================
export * from './scheme/AffineScheme';
export * as SchemeStructureSheaf from './scheme/StructureSheaf';
export * from './scheme/SchemeMorphism';
export * from './scheme/FiberProduct';
export * from './scheme/ProjectiveScheme';

// ============================================================================
// Topos modules（拓扑斯模块）
// ============================================================================
export * from './topos/SubobjectClassifier';
export * from './topos/SheafTopos';
export * as ToposGeometricMorphism from './topos/GeometricMorphism';
export * from './topos/InternalLogic';
// export * from './topos/SetTopos'; // TS2307: module not found
// export * from './topos/SiteTopology'; // TS2307: module not found
// export * from './topos/ToposCoherence'; // TS2307: module not found

// ============================================================================
// Operad modules（Operad模块）
// ============================================================================
// export * from './operad/OperadAlgebra'; // TS2307: module not found
// export * from './operad/OperadComposition'; // TS2307: module not found
// export * from './operad/OperadTree'; // TS2307: module not found
// export * from './operad/StasheffPolytope'; // TS2307: module not found
// export * from './operad/InfinityOperad'; // TS2307: module not found

// ============================================================================
// Motive modules（Motive模块）
// ============================================================================
export * from './motive/ChowGroup';
export * from './motive/MotiveCategory';
export * from './motive/WeilCohomology';
// export * from './motive/StandardConjecture'; // TS2307: module not found
// export * from './motive/MotiveIntegral'; // TS2307: module not found

// ============================================================================
// Deformation modules（形变模块）
// ============================================================================
export * as DeformationInfinitesimalDeformation from './deformation/InfinitesimalDeformation';
export * from './deformation/ObstructionTheory';
export * from './deformation/KodairaSpencer';
export * from './deformation/DeformationFunctor';
// export * from './deformation/LocalModuliSpace'; // TS2307: module not found

// ============================================================================
// Moduli modules（模空间模块）
// ============================================================================
export * from './moduli/FineModuliSpace';
export * from './moduli/CoarseModuliSpace';
export * from './moduli/StableCurve';
export * from './moduli/DonaldsonInvariant';
export * from './moduli/ModuliStack';

// ============================================================================
// Arithmetic modules（算术几何模块）
// ============================================================================
export * from './arithmetic/EllipticCurve';
export * from './arithmetic/ModularForm';
export * from './arithmetic/LFunction';
export * from './arithmetic/BSDConjecture';
export * from './arithmetic/GaloisRepresentation';
