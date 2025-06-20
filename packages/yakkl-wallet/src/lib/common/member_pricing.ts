import { EARLY_ADOPTER_DEADLINES, FOUNDING_MEMBER_DEADLINE, YAKKL_PRO_ANNUAL_FEE } from "./constants";
import { log } from "$lib/managers/Logger";

/**
 * Returns the price for the current date based on EARLY_ADOPTER_USER_DEADLINES.
 * If after all deadlines, returns the last price.
 */
export function getEarlyAdopterPrice(now: Date = new Date()): number {
  for (const offer of EARLY_ADOPTER_DEADLINES) {
    if (now < new Date(offer.date)) {
      return offer.price;
    }
  }
  // If after all deadlines, return last price
  return EARLY_ADOPTER_DEADLINES[EARLY_ADOPTER_DEADLINES.length - 1].price;
}

/**
 * Returns the price for the Founding Member.
 * If the current date is before the deadline, returns the price.
 * Otherwise, returns null.
 */
export function getFoundingMemberPrice(now: Date = new Date()): number | null {
  if (now < new Date(FOUNDING_MEMBER_DEADLINE)) {
    return 100; // Return the price for Founding Member
  }
  return null;
}

/**
 * Returns the applicable user price based on the current date.
 * Checks Founding Member price first, then Early Adopter price,
 * and finally returns the ongoing annual fee of 144 if all deadlines have passed.
 */
export function getMemberUpgradePrice(now: Date = new Date()): number {
  try {
  const foundingMemberPrice = getFoundingMemberPrice(now);
  if (foundingMemberPrice !== null) {
    return foundingMemberPrice;
  }
  for (const offer of EARLY_ADOPTER_DEADLINES) {
    if (now < new Date(offer.date)) {
      return offer.price;
    }
  }
    // Ongoing annual YAKKL Pro fee
    return YAKKL_PRO_ANNUAL_FEE;
  } catch (error) {
    log.warn('Error determining available member upgrade plan level:', false, error);
    return YAKKL_PRO_ANNUAL_FEE;
  }
}

/**
 * Returns the available member upgrade plan level based on the current date.
 * Checks eligibility for founding_member, early_adopter, or yakkl_pro status.
 * Returns 'yakkl_pro' as default if not found or if an error occurs.
 */
export function getAvailableMemberUpgradePlanLevel(now: Date = new Date()): 'founding_member' | 'early_adopter' | 'yakkl_pro' {
  try {
    // Check if still eligible for founding member status
    if (now < new Date(FOUNDING_MEMBER_DEADLINE)) {
      return 'founding_member';
    }

    // Check if still eligible for early adopter status
    for (const offer of EARLY_ADOPTER_DEADLINES) {
      if (now < new Date(offer.date)) {
        return 'early_adopter';
      }
    }

    // Default to yakkl_pro if all deadlines have passed
    return 'yakkl_pro';

  } catch (error) {
    log.warn('Error determining available member upgrade plan level:', false, error);
    return 'yakkl_pro';
  }
}

