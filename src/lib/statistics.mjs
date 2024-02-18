/**
 * This class deals with everything statistical
 *
 * @module stats
 */

import log from 'loglevel';
import is from 'is-it-check';

/** Calculate statistics */
class Statistics {
  #config; // the config that needs to be calculated
  #cache; // a cache of stats

  // entropy thresholds
  #entropyBlindThreshold = 78;
  #entropySeenThreshold = 52;

  /**
 * Constructor
 * @constructor
 *
 * @param {object} config - the current config
 */
  constructor(config) {
    this.#config = config;
    this.#cache = {
      config: {
        stats: {},
        valid: false,
      },
      entropy: {
        stats: {},
        valid: false,
      },
      dictionary: {
        stats: {},
        valid: false,
      },
    };
    this.configStats(true);

    log.setLevel('error');
  }

  /**
   *
   * Calculate statistics for a given configuration
   *
   * Returns: A statistics object indexed by the following keys:
   *   * minLength: the minimum possible length of a password
   *       generated by the given config
   *   * maxLength: the maximum possible length of a password
   *       generated by the given config
   *   * randomNumbersRequired: the number of random numbers needed
   *       to generate a single password using the given config
   * Arguments: OPTIONAL 'suppressWarnings' to indicate that
   *       no warnings should be issued if the config is such that there
   *       are uncertainties in the calculation.
   * TODO: figure out what 'carps' is
   * Throws: an Error on invalid invocation or args, carps if multi-character
   *       substitutions are in use when not using adapive padding
   *
   * Notes: This function ignores character replacements, if one or more
   *       multi-character replacements are used when padding is not set
   *       to adaptive, this function will return an invalid max length.
   *
   * TODO can we move this to the Presets class?
   * ? stats in Statistics class or configStats in Presets
   *
   * @param {boolean} suppressWarnings - suppress warnings, defaults to false
   * @throws Error on exception
   * @return {object} - stats object on this config
   */
  configStats(suppressWarnings = false) {
    // TODO do we need to validate the config? If so, how
    if (suppressWarnings) {
      // do nothing for now
    }

    // if there is no change, don't recalculate the stats
    if (this.#cache.config.valid) {
      return this.#cache.config.stats;
    }

    const config = this.#config;

    let minLength = 0;
    let maxLength = 0;
    const separator = (config.separator_character == 'RANDOM' ? 1 : 0);

    if (config.padding_type == 'ADAPTIVE') {
      minLength = maxLength = config.pad_to_length;
    } else {
      // calculate the length of everything but the words themselves

      let baseLength = 0;
      if (config.padding_type == 'FIXED') {
        baseLength += config.padding_characters_before +
          config.padding_characters_after;
      }
      if (config.padding_digits_before > 0) {
        baseLength += config.padding_digits_before + separator;
      }
      if (config.padding_digits_after > 0) {
        baseLength += config.padding_digits_after + separator;
      }
      if (separator == 1) {
        baseLength += config.num_words - 1;
      }

      // maximise and minimise the word lengths to calculate the final answers
      minLength = baseLength + (config.num_words * config.word_length_min);
      maxLength = baseLength + (config.num_words * config.word_length_max);
    }

    // calculate the number of random numbers needed to generate the password
    const randomNumbers = this.__randomNumbersRequired();

    // TODO this has to be done, there are no subsitutions for now

    // detect whether or not we need to carp about multi-character replacements
    // if(config.padding_type != 'ADAPTIVE' && !suppressWarnings){
    //     if(config.character_substitutions != undefined ){
    // CHAR_SUB:
    // foreach let char (keys %{config.character_substitutions}}){
    //     if (ref config.character_substitutions}->{$char} eq 'ARRAY') {
    //         foreach let sub (@{config.character_substitutions}->{$char}}) {
    //             if (length $sub > 1) {
    //                 _warn('maximum length may be underestimated.
    // The loaded config contains at least one character substitution
    // which replaces a single character with multiple characters.');
    //                 last CHAR_SUB;
    //             }
    //         }
    //     }
    //     else {
    //         if(length config.character_substitutions}->{$char} > 1){
    //             _warn('maximum length may be underestimated.
    // The loaded config contains at least one character substitution
    // which replaces a single character with multiple characters.');
    //             last CHAR_SUB;
    //         }
    //     }
    // }
    //     }
    // }

    this.#cache.config.stats = {
      minLength: minLength,
      maxLength: maxLength,
      randomNumbersRequired: randomNumbers,
    };
    this.#cache.config.valid = true;
    return this.#cache.config.stats;
  } // configStats

  /**
   * Return statistics about the instance
   *
   * Returns: A dictionary of statistics indexed by the following keys:
   *   * dictionary_source - the source of the word list
   *   * dictionary_words_total - the total number of words loaded
   *        from the dictionary file
   *   * dictionary_words_filtered - the number of words loaded from
   *        the dictionary file that meet the lenght criteria set in the
   *        loaded config
   *   * dictionary_words_percent_available - the percentage of the
   *        total dictionary that is avialable for use with the loaded
   *        config
   *   * dictionary_filter_length_min - the minimum length world
   *        permitted by the filter
   *   * dictionary_filter_length_max - the maximum length world
   *        permitted by the filter
   *   * dictionary_contains_accents - whether or not the filtered
   *        list contains accented letters
   *   * password_entropy_blind_min - the entropy of the shortest
   *        password this config can generate from the point of view of a
   *        brute-force attacker in bits
   *   * password_entropy_blind_max - the entropy of the longest
   *        password this config can generate from the point of view of a
   *        brute-force attacker in bits
   *   * password_entropy_blind - the entropy of the average length
   *        of password generated by this configuration from the point of
   *        view of a brute-force attacker in bits
   *   * password_entropy_seen - the true entropy of passwords
   *        generated by this instance assuming the dictionary and config
   *        are known to the attacker in bits
   *   * password_length_min - the minimum length of passwords
   *        generated with this instance's config
   *   * password_length_max - the maximum length of passwords
   *        generated with this instance's config
   *   * password_permutations_blind_min - the number of permutations
   *        a brute-froce attacker would have to try to be sure of success
   *        on the shortest possible passwords geneated by this instance
   *        as a Math::BigInt object
   *   * password_permutations_blind_max - the number of permutations
   *        a brute-froce attacker would have to try to be sure of success
   *        on the longest possible passwords geneated by this instance as
   *        a Math::BigInt object
   *   * password_permutations_blind - the number of permutations
   *        a brute-froce attacker would have to try to be sure of success
   *        on the average length password geneated by this instance as a
   *        Math::BigInt object
   *   * password_permutations_seen - the number of permutations an
   *        attacker with a copy of the dictionary and config would need to
   *        try to be sure of cracking a password generated by this
   *        instance as a Math::BigInt object
   *   * password_random_numbers_required - the number of random
   *        numbers needed to generate a single password using the loaded
   *        config
   *   * passwords_generated - the number of passwords this instance
   *        has generated
   *   * randomnumbers_cached - the number of random numbers
   *        currently cached within the instance
   *   * randomnumbers_cache_increment - the number of random numbers
   *        generated at once to re-plenish the cache when it's empty
   *   * randomnumbers_source - the name of the class used to
   *        generate random numbers
   *
   * @return {object} stats - the statistics
   * @throws Error on exception
   *
   */
  calculateStats() {
    // create a dictionary to assemble all the stats into
    const stats = {};

    // deal with the dictionary file
    const dictStats = this.__calculateDictionaryStats();

    stats.dictionary = dictStats;

    // deal with the config-specific stats
    const configStats = this.configStats();

    // deal with the entropy stats
    const entropyStats = this.__calculateEntropyStats();

    // add them to the password object
    stats.password = {
      minLength: configStats.minLength,
      maxLength: configStats.maxLength,
      randomNumbersRequired: configStats.randomNumbersRequired,
      passwordStrength: this.__passwordStrength(entropyStats),
    };

    stats.entropy = entropyStats;
    stats.entropy.blindThreshold = this.#entropyBlindThreshold;
    stats.entropy.seenThreshold = this.#entropySeenThreshold;

    // deal with password counter
    // TODO this should probably be moved to XKPasswd
    // stats.passwords_generated = this.#PASSWORD_COUNTER;

    // deal with the random number generator
    // TODO this should probably be moved to XKPasswd
    // stats.randomNumbers = {
    //  cached: this._CACHE_RANDOM,
    //  source = this._RNG,
    // }

    // return the stats
    log.trace(`returning the stats: ${JSON.stringify(stats)}`);
    return stats;
  }

  /* 2024-02-18 the documentation below is taken out,
   * because the BigInts are not necessary and cause problems
   *
   *   * minPermutationsBlind - the number of permutations to be
   *        tested by an attacker with no knowledge of the dictionary file
   *        used, or the config used, assuming the minimum possible
   *        password length from the given config (as BigInt)
   *   * maxPermutationsBlind - the number of permutations to be
   *        tested by an attacker with no knowledge of the dictionary file
   *        used, or the cofig file used, assuming the maximum possible
   *        password length fom the given config (as BigInt)
   *   * permutationsBlind - the number of permutations for the
   *        average password length for the given config (as BigInt)
   *   * permutationsSeen - the number of permutations to be tested
   *        by an attacker with full knowledge of the dictionary file and
   *        configuration used (as BigInt)
  */


  /**
   * Gather entropy stats for the combination
   * of the loaded config and dictionary.
   *
   * Returns: A stats object indexed by:
   *   * minEntropyBlind - object
   *          - value - minPermutationsBlind converted to bits
   *          - state - POOR | OK | GOOD
   *   * maxEntropyBlind - object
   *          - value - maxPermutationsBlind converted to bits
   *          - state - POOR | OK | GOOD
   *   * entropyBlind - permutationsBlind converted to bits
   *   * entropySeen - object
   *          - value - permutationsSeen converted to bits
   *          - state - POOR | OK | GOOD
   *
   * Notes: This function uses configStats() to determine the longest and
   *       shortest password lengths, so the caveat that function has
   *       when it comes to multi-character substitutions applies here too.
   *       This function assumes no accented characters (at least for now).
   *       For the blind calculations, if any single symbol is present, a
   *       search-space of 33 symbols is assumed (same as password
   *       haystacks page)
   *
   * @return {object} - entropy stats
   * @throws {Error} - Exception on error
   * @private
   */
  __calculateEntropyStats() {
    if (this.#cache.entropy.valid) {
      return this.#cache.entropy.stats;
    }
    const config = this.#config;

    // get the password length details for the config
    const configStats = this.configStats();

    const minLength = BigInt(configStats.minLength);
    const maxLength = BigInt(configStats.maxLength);

    // calculate the blind permutations - (based purely on length and alphabet)
    let alphabetCount = 26; // all passwords have at least one case of letters
    if ('ALTERNATE CAPITALISE INVERT RANDOM'
      .indexOf(config.case_transform) > -1) {
      alphabetCount += 26;
    }
    if (config.padding_digits_before > 0 || config.padding_digits_after > 0) {
      alphabetCount += 10;
    }

    log.setLevel('warn');

    log.trace('alphabetCount: ' + alphabetCount);

    // TODO replace pseudocode with real code
    //  if($self->_passwords_will_contain_symbol()
    // || $self->{_CACHE_CONTAINS_ACCENTS}){
    if (false) {
      // the config almost certainly includes a symbol,
      // so add 33 to the alphabet (like password haystacks does)
      alphabetCount += 33;
    }

    // get all permutations together as BigInts
    // and convert back to Numbers afterwards
    const statsBigInt = {};

    const lengthAverage =
        Math.round((configStats.minLength + configStats.maxLength) / 2);

    log.trace(`DEBUG: lengthAverage = ${lengthAverage}`);

    statsBigInt.alphabetCount = BigInt(alphabetCount);
    statsBigInt.minPermutationsBlind =
      (statsBigInt.alphabetCount ** BigInt(minLength));

    log.trace('minPermutationsBlind=' + statsBigInt.minPermutationsBlind);

    statsBigInt.maxPermutationsBlind =
    (statsBigInt.alphabetCount ** BigInt(maxLength));
    log.trace('maxPermutationsBlind=' + statsBigInt.maxPermutationsBlind);

    statsBigInt.permutationsBlind =
      (statsBigInt.alphabetCount ** BigInt(lengthAverage));
    log.trace('permutationsBlind=' + statsBigInt.permutationsBlind);

    // calculate the seen permutations

    // TODO figure this cache thing out
    // let num_words = scalar @{$self->{_CACHE_DICTIONARY_LIMITED}};

    // For now
    const numWords = this.#config.num_words;
    const numWordsConfig = this.#config.num_words; // convenience variable
    const numWordsBigInt = BigInt(numWords);
    let seenPermutationsBigInt = BigInt('0');

    // start with the permutations from the chosen words
    seenPermutationsBigInt += (numWordsBigInt ** BigInt(numWordsConfig));

    // then add the extra randomness from the case transformations (if any)

    switch (this.#config.case_transform) {
    case 'ALTERNATE':
      // multiply by two for the one random decision about
      // whether or capitalise the odd or even words
      seenPermutationsBigInt *= BigInt(2);

    case 'RANDOM':
      // multiply by two for each word

      for (let n = 0; n < numWordsConfig; n++) {
        seenPermutationsBigInt *= BigInt(2);
      }
      break;
    default:
      break;
    }

    // multiply in the permutations from the separator
    // (if any - i.e. if it's randomly chosen)

    if (this.#config.separator_character === 'RANDOM') {
      if (!is.undefined(this.#config.separator_alphabet)) {
        seenPermutationsBigInt *=
          BigInt(this.#config.separator_alphabet.length);
      } else {
        seenPermutationsBigInt *=
          BigInt(this.#config.symbol_alphabet.length);
      }
    }

    // multiply in the permutations from the padding character
    // (if any - i.e. if it's randomly chosen)

    if (this.#config.padding_type !== 'NONE' &&
      this.#config.padding_character === 'RANDOM') {
      if (!is.undefined(this.#config.padding_alphabet)) {
        seenPermutationsBigInt *= BigInt(this.#config.padding_alphabet.length);
      } else {
        seenPermutationsBigInt *= BigInt(this.#config.symbol_alphabet.length);
      }
    }
    // multiply in the permutations from the padding digits (if any)
    let numPaddingDigits =
      this.#config.padding_digits_before + this.#config.padding_digits_after;
    while (numPaddingDigits > 0) {
      seenPermutationsBigInt *= BigInt('10');
      numPaddingDigits--;
    }

    // multiply in possible substituted characters
    // TODO fix this later
    // if (this.#config.character_substitutions &&
    // this.#config.substitution_mode} // 'ALWAYS') ne 'NEVER') {
    //     for let n (1..this.#config.num_words}){
    //         for let m (keys %{this.#config.character_substitutions}}) {
    //             let sb=this.#config.character_substitutions}->{$m};
    //             if (ref $sb eq 'ARRAY') {
    //                 seenPermutationsBigInt *= BigInt($#$sb+2));
    //             }
    //             else {
    //                 if (this.#config.substitution_mode} &&
    //                   this.#config.substitution_mode} eq 'RANDOM') {
    //                     seenPermutationsBigInt *= BigInt(2));
    //                 }
    //             }
    //         }
    //     }
    // }

    const stats = {};

    // Note these stats keys will hold BigInt variables
    // 2024-02-18 not sure we need them and they cause
    // all kinds of problems

    // stats.permutationsSeen = seenPermutationsBigInt;
    // log.trace('got permutationsSeen=' + stats.permutationsSeen);

    // stats.minPermutationsBlind = statsBigInt.minPermutationsBlind;

    // stats.maxPermutationsBlind = statsBigInt.maxPermutationsBlind;

    // stats.permutationsBlind = statsBigInt.permutationsBlind;

    // calculate the entropy values based on the permutations

    // Note: Math.log2() does not work on BigInt, but
    // see https://stackoverflow.com/a/70385364
    // which comes down to log2(largeNumber) =
    // BigInt(largeNumber.toString()).toString(2).length

    const minEntropyBlind = statsBigInt.minPermutationsBlind.toString(2).length;
    log.trace('got minEntropyBlind=' + minEntropyBlind);

    const maxEntropyBlind = statsBigInt.maxPermutationsBlind.toString(2).length;
    log.trace('got maxEntropyBlind=' + maxEntropyBlind);

    stats.entropyBlind = statsBigInt.permutationsBlind.toString(2).length;
    log.trace('got entropyBlind=' + stats.entropyBlind);

    const entropySeen = seenPermutationsBigInt.toString(2).length;
    log.trace('got entropySeen=' + entropySeen);

    const entropyBlindThreshold = this.#entropyBlindThreshold;
    const entropySeenThreshold = this.#entropySeenThreshold;

    const entropy = {
      minEntropyBlind: {
        value: minEntropyBlind,
        state: 'OK',
      },
      maxEntropyBlind: {
        value: maxEntropyBlind,
        state: 'OK',
      },
      entropySeen: {
        value: entropySeen,
        state: 'OK',
      },
    };

    // first the blind entropy
    if (minEntropyBlind == maxEntropyBlind) {
      entropy.minEntropyBlind.equal = true;
      if (minEntropyBlind >= entropyBlindThreshold) {
        entropy.minEntropyBlind.state = 'GOOD';
      } else {
        entropy.minEntropyBlind.state = 'POOR';
      }
    } else {
      entropy.minEntropyBlind.equal = false;
      if (minEntropyBlind >= entropyBlindThreshold) {
        entropy.minEntropyBlind.state = 'GOOD';
      } else {
        entropy.minEntropyBlind.state = 'POOR';
      }
      if (maxEntropyBlind >= entropyBlindThreshold) {
        entropy.maxEntropyBlind.state = 'GOOD';
      } else {
        entropy.maxEntropyBlind.state = 'POOR';
      }
    }

    // seen entropy
    if (entropySeen >= entropySeenThreshold) {
      entropy.entropySeen.state = 'GOOD';
    } else {
      entropy.entropySeen.state = 'POOR';
    }

    stats.minEntropyBlind = entropy.minEntropyBlind;
    stats.maxEntropyBlind = entropy.maxEntropyBlind;
    stats.entropySeen = entropy.entropySeen;

    this.#cache.entropy.stats = stats;
    this.#cache.entropy.valid = true;

    log.trace(`returning entropy stats: ${JSON.stringify(stats)}`);
    log.setLevel('debug');
    // return the stats
    return this.#cache.entropy.stats;
  } // __calculateEntropyStats

  /**
   * Find out the password strength
   *
   * Notes: the stats object passed are just
   * the entropies, not the full stats object
   *
   * @param {object} stats - object holding the entropies
   * @return {string} - password strength code
   *
   * @private
   */
  __passwordStrength(stats) {
    const minEntropyBlind = stats.minEntropyBlind;
    const entropySeen = stats.entropySeen;

    const entropyBlindThreshold = this.#entropyBlindThreshold;
    const entropySeenThreshold = this.#entropySeenThreshold;

    // mix of good and bad
    let passwordStrength = 'OK';

    if (minEntropyBlind >= entropyBlindThreshold &&
      entropySeen >= entropySeenThreshold) {
      // all good
      passwordStrength = 'GOOD';
    } else if (minEntropyBlind < entropyBlindThreshold &&
      entropySeen < entropySeenThreshold) {
      // all bad
      passwordStrength = 'POOR';
    }
    return passwordStrength;
  }


  /**
   * Calculate the number of random numbers needed to generate a
   * single password with a given config.
   *
   * TODO do we really need this function?
   *
   * @return {integer} the number of random numbers required
   */
  __randomNumbersRequired() {
    let randomNumbers = 0;

    randomNumbers += this.#config.num_words;
    if (this.#config.case_transform === 'RANDOM') {
      randomNumbers += this.#config.num_words;
    }
    if (this.#config.separator_character == 'RANDOM') {
      randomNumbers++;
    }
    if (!is.undefined(this.#config.padding_character) &&
       this.#config.padding_character === 'RANDOM') {
      randomNumbers++;
    }
    randomNumbers += this.#config.padding_digits_before;
    randomNumbers += this.#config.padding_digits_after;

    // return the number
    return randomNumbers;
  }


  /**
   * Calculate Dictionary statistics
   *
   * @return {object} - the statistics
   *
   * @private
   */
  __calculateDictionaryStats() {
    return {
      source: '',
      numWordsTotal: 0,
      numWordsFiltered: 0,
      percentWordsAvailable: 0,
      filterMinLength: 0,
      filterMaxLength: 0,
      containsAccents: false,
    };
  }
}

export {Statistics};
