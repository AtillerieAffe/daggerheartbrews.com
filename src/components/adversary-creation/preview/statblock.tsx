import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { AdversaryDetails } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type AdversaryPreviewStatblockProps = React.ComponentProps<'div'> & {
  adversary: AdversaryDetails;
  page?: number;
  onPageChange?: (page: number) => void;
  onTotalPagesChange?: (total: number) => void;
  showControls?: boolean;
};

const HEADING_FONT_SIZE = '21px';
const SUBHEADING_FONT_SIZE = '15px';
const BODY_FONT_SIZE = '10px';
const STAT_FONT_SIZE = '10px';
const FEATURE_HEADING_FONT_SIZE = '15px';

const FEATURE_CONTAINER_CLASSES =
  'space-y-1 text-[11px] [&_ol]:ml-4 [&_p]:pl-4 [&_p:has(strong)]:-indent-4 [&_ul]:ml-4';

const fallbackSplit = (value: string) => {
  const marker = '__FEATURE_BREAK__';
  const marked = value.replace(
    /(<p[^>]*>\s*(?:<em>\s*)?<strong[^>]*>)/gi,
    `${marker}$1`,
  );
  return marked
    .split(marker)
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const parseFeatureBlocks = (html?: string | null): string[] => {
  if (!html) return [];
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const segments = fallbackSplit(html);
    return segments.length ? segments : [html];
  }
  const template = document.createElement('template');
  template.innerHTML = html;
  const children = Array.from(template.content.children);
  if (!children.length) {
    const segments = fallbackSplit(html);
    return segments.length ? segments : [html];
  }
  const groups: Element[][] = [];
  let currentGroup: Element[] = [];
  const pushGroup = () => {
    if (!currentGroup.length) return;
    groups.push(currentGroup);
    currentGroup = [];
  };

  children.forEach((child) => {
    const isFeatureHeader =
      child.tagName.toLowerCase() === 'p' && child.querySelector('strong');
    if (isFeatureHeader && currentGroup.length) {
      pushGroup();
    }
    currentGroup.push(child);
  });
  pushGroup();

  if (!groups.length) {
    const segments = fallbackSplit(html);
    return segments.length ? segments : children.map((child) => child.outerHTML);
  }
  const domSegments = groups.map((group) =>
    group.map((element) => element.outerHTML).join(''),
  );
  return domSegments.length ? domSegments : fallbackSplit(html);
};

const pagesEqual = (a: string[][], b: string[][]) =>
  a.length === b.length &&
  a.every(
    (page, index) =>
      page.length === b[index]?.length &&
      page.every((item, itemIndex) => item === b[index]?.[itemIndex]),
  );

export const AdversaryPreviewStatblock = React.forwardRef<
  HTMLDivElement,
  AdversaryPreviewStatblockProps
>(
  (
    {
      className,
      adversary,
      page,
      onPageChange,
      onTotalPagesChange,
      showControls = true,
      ...props
    },
    ref,
  ) => {
  const {
    name,
    type,
    subtype,
    tier,
    description,
    subDescription,
    experience,
    difficulty,
    thresholds,
    hp,
    stress,
    weapon,
    attack,
    distance,
    damageAmount,
    damageType,
    potential,
    text,
  } = adversary;

  const featureBlocks = React.useMemo(() => parseFeatureBlocks(text), [text]);
  const [pages, setPages] = React.useState<string[][]>(() =>
    featureBlocks.length ? [featureBlocks] : [[]],
  );
  const [internalPage, setInternalPage] = React.useState(0);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const measurementRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);

  const computePages = React.useCallback(() => {
    const measurer = measurementRef.current;
    const cardEl = innerRef.current;
    if (!measurer || !cardEl) return;
    const cardHeight = cardEl.clientHeight;
    const cardWidth = cardEl.clientWidth;
    if (!cardHeight || !cardWidth) return;

    measurer.style.position = 'absolute';
    measurer.style.left = '0';
    measurer.style.top = '0';
    measurer.style.width = `${cardWidth}px`;
    measurer.style.maxWidth = `${cardWidth}px`;
    measurer.style.height = `${cardHeight}px`;
    measurer.style.maxHeight = `${cardHeight}px`;
    measurer.style.pointerEvents = 'none';
    measurer.style.visibility = 'hidden';
    measurer.style.opacity = '0';
    measurer.style.zIndex = '-1';
    measurer.style.boxSizing = 'border-box';

    const safe = (value: string | number | null | undefined) =>
      value == null ? '' : String(value).replace(/`/g, '&#96;');

    const createFragment = (html: string) => {
      const template = document.createElement('template');
      template.innerHTML = html.trim();
      return template.content;
    };

    const appendHtml = (parent: HTMLElement, html: string) => {
      const fragment = createFragment(html);
      parent.appendChild(fragment);
    };

    const tierDisplay = tier ?? '';
    const subtypeDisplay = subtype ?? '';
    const motivesLabel = type === 'adversary' ? 'Motives & Tactics' : 'Impulses';

    const introHtml = `
      <div class="space-y-1">
        <h3 class="font-eveleth-clean" style="font-size: ${HEADING_FONT_SIZE}">${safe(name)}</h3>
        <p class="text-base font-bold capitalize"><em>Tier ${safe(tierDisplay)} ${safe(subtypeDisplay)}</em></p>
        <p style="font-size: ${BODY_FONT_SIZE}"><em>${safe(description)}</em></p>
        <p style="font-size: ${BODY_FONT_SIZE}"><strong>${safe(motivesLabel)}: </strong>${safe(subDescription)}</p>
      </div>
    `;

    const thresholdsHtml = thresholds
      ? `${formatThresholds(thresholds[0])} / ${formatThresholds(thresholds[1])}`
      : '';

    const statsClass =
      type === 'adversary' ? 'border-[#bcab84]' : 'border-[#aaa8a9]';

    const statsHtml =
      type === 'adversary'
        ? `
      <div class="border-t border-b bg-white p-3 ${statsClass}">
        <p style="font-size: ${STAT_FONT_SIZE}"><strong>Difficulty: </strong>${safe(difficulty)} | <strong>Thresholds: </strong>${safe(thresholdsHtml)} | <strong>HP: </strong>${safe(hp)} | <strong>Stress: </strong>${safe(stress)}</p>
        <p class="capitalize" style="font-size: ${STAT_FONT_SIZE}"><strong>ATK: </strong>${safe(attack)} | <strong>${safe(weapon)}: </strong>${safe(distance)} | ${safe(damageAmount)} (${safe(damageType)})</p>
        ${experience ? `<p style="font-size: ${STAT_FONT_SIZE}"><strong>Experience:</strong> ${safe(experience)}</p>` : ''}
      </div>
    `
        : `
      <div class="border-t border-b bg-white p-3 ${statsClass}">
        <p style="font-size: ${STAT_FONT_SIZE}"><strong>Difficulty: </strong>${safe(difficulty)}</p>
        <p class="capitalize" style="font-size: ${STAT_FONT_SIZE}"><strong>Potential Adversaries: </strong>${safe(potential)}</p>
      </div>
    `;

    const joinClasses = (...parts: string[]) =>
      parts
        .reduce<string[]>((acc, part) => {
          if (!part) return acc;
          const tokens = part.split(/\s+/).filter(Boolean);
          if (!tokens.length) {
            return acc;
          }
          return acc.concat(tokens);
        }, [])
        .join(' ');

    const createPageSkeleton = (continued: boolean) => {
      measurer.innerHTML = '';
      const page = document.createElement('div');
      page.className = 'flex h-full flex-col space-y-1 p-4';
      page.style.width = '100%';
      page.style.height = `${cardHeight}px`;
      page.style.maxHeight = `${cardHeight}px`;
      page.style.boxSizing = 'border-box';
      measurer.appendChild(page);

      if (!continued) {
        appendHtml(page, introHtml);
        appendHtml(page, statsHtml);
      }

      const featuresWrapper = document.createElement('div');
      featuresWrapper.className = 'flex-1 min-h-0';

      const featuresSection = document.createElement('div');
      featuresSection.className = 'flex h-full flex-col';

      const heading = document.createElement('h3');
      heading.className = 'font-eveleth-clean';
      heading.style.fontSize = `${FEATURE_HEADING_FONT_SIZE}`;
      heading.textContent = continued ? 'Features (Continued)' : 'Features';

      const viewport = document.createElement('div');
      viewport.className = 'relative flex-1 min-h-0 overflow-hidden';

      const featuresContainer = document.createElement('div');
      featuresContainer.className = joinClasses(
        'absolute inset-0 overflow-visible',
        FEATURE_CONTAINER_CLASSES,
      );

      featuresSection.appendChild(heading);
      featuresSection.appendChild(viewport);
      viewport.appendChild(featuresContainer);
      featuresWrapper.appendChild(featuresSection);
      page.appendChild(featuresWrapper);

      return { page, featuresContainer, viewport };
    };

    const createFeatureNode = (html: string) => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-preview-feature', 'true');
      wrapper.innerHTML = html;
      return wrapper;
    };

    const fitsWithinViewport = (
      viewport: HTMLElement,
      container: HTMLElement,
    ) => container.scrollHeight <= viewport.clientHeight + 0.5;

    const pages: string[][] = [];
    let featureIndex = 0;

    const firstPage = createPageSkeleton(false);
    const firstPageFeatures: string[] = [];

    const firstViewportHeight = firstPage.viewport.clientHeight;
    if (firstViewportHeight > 0) {
      while (featureIndex < featureBlocks.length) {
        const block = featureBlocks[featureIndex];
        const node = createFeatureNode(block);
        firstPage.featuresContainer.appendChild(node);
        if (fitsWithinViewport(firstPage.viewport, firstPage.featuresContainer)) {
          firstPageFeatures.push(block);
          featureIndex += 1;
        } else {
          firstPage.featuresContainer.removeChild(node);
          break;
        }
      }
    }
    pages.push(firstPageFeatures);

    while (featureIndex < featureBlocks.length) {
      const continuedPage = createPageSkeleton(true);
      const pageFeatures: string[] = [];

      while (featureIndex < featureBlocks.length) {
        const block = featureBlocks[featureIndex];
        const node = createFeatureNode(block);
        continuedPage.featuresContainer.appendChild(node);
        if (
          fitsWithinViewport(continuedPage.viewport, continuedPage.featuresContainer)
        ) {
          pageFeatures.push(block);
          featureIndex += 1;
        } else {
          continuedPage.featuresContainer.removeChild(node);
          break;
        }
      }

      if (!pageFeatures.length && featureIndex < featureBlocks.length) {
        const block = featureBlocks[featureIndex];
        const fallbackNode = createFeatureNode(block);
        continuedPage.featuresContainer.appendChild(fallbackNode);
        pageFeatures.push(block);
        featureIndex += 1;
      }

      pages.push(pageFeatures);
    }

    measurer.innerHTML = '';

    if (!pages.length) {
      pages.push([]);
    }

    setPages((prev) => (pagesEqual(prev, pages) ? prev : pages));
  }, [
    featureBlocks,
    name,
    tier,
    subtype,
    description,
    subDescription,
    type,
    difficulty,
    thresholds,
    hp,
    stress,
    attack,
    weapon,
    distance,
    damageAmount,
    damageType,
    experience,
    potential,
  ]);
  const isControlled = typeof page === 'number';
  React.useEffect(() => {
    const initialPages = featureBlocks.length ? [featureBlocks] : [[]];
    setPages((prev) => (pagesEqual(prev, initialPages) ? prev : initialPages));
    if (isControlled) {
      onPageChange?.(0);
    } else {
      setInternalPage(0);
    }
  }, [featureBlocks, isControlled, onPageChange]);

  React.useLayoutEffect(() => {
    computePages();
  }, [computePages]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.requestAnimationFrame(() => computePages());
    return () => window.cancelAnimationFrame(id);
  }, [computePages]);

  React.useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;
    if (typeof window === 'undefined' || !('ResizeObserver' in window)) return;
    const observer = new window.ResizeObserver(() => computePages());
    observer.observe(container);
    return () => observer.disconnect();
  }, [computePages]);

  const totalPages = Math.max(pages.length, 1);
  const clampPage = React.useCallback(
    (value: number) => Math.max(0, Math.min(value, totalPages - 1)),
    [totalPages],
  );
  const activePage = isControlled
    ? clampPage(page ?? 0)
    : clampPage(internalPage);

  React.useEffect(() => {
    onTotalPagesChange?.(totalPages);
  }, [totalPages, onTotalPagesChange]);

  React.useEffect(() => {
    if (!isControlled) {
      setInternalPage((prev) => clampPage(prev));
    } else if (typeof page === 'number') {
      const next = clampPage(page);
      if (next !== page) {
        onPageChange?.(next);
      }
    }
  }, [clampPage, isControlled, page, onPageChange]);

  const setPageValue = React.useCallback(
    (value: number) => {
      const next = clampPage(value);
      if (!isControlled) {
        setInternalPage(next);
      }
      onPageChange?.(next);
    },
    [clampPage, isControlled, onPageChange],
  );

  const hasMultiplePages = totalPages > 1;
  const firstPageBlocks = pages[0] ?? [];
  const subsequentPages = pages.slice(1);
  const goToPrevious = () => setPageValue(activePage - 1);
  const goToNext = () => setPageValue(activePage + 1);

  const formatThresholds = (n: number) => (n === 0 ? 'None' : n);

  const cardClasses = cn(
    'aspect-card w-[424px] overflow-hidden rounded-md border text-black',
    type === 'adversary' && 'border-[#bcab84] bg-[#f4f0e5]',
    type === 'environment' && 'border-[#aaa8a9] bg-[#ededed]',
    className,
  );

  return (
    <div className='flex flex-col items-center gap-3'>
      <div
        ref={ref}
        data-adversary-preview-root
        className={cardClasses}
        {...props}
      >
        <div className='relative h-full'>
          <div
            ref={innerRef}
            className={cn('h-full', activePage !== 0 && 'hidden')}
          >
            <div className='flex h-full flex-col space-y-1 p-4'>
              <div className='space-y-1'>
                <h3
                  className='font-eveleth-clean'
                  style={{ fontSize: HEADING_FONT_SIZE }}
                >
                  {name}
                </h3>
                <p
                  className='font-bold capitalize'
                  style={{ fontSize: SUBHEADING_FONT_SIZE }}
                >
                  <em>
                    Tier {tier} {subtype}
                  </em>
                </p>
                <p style={{ fontSize: BODY_FONT_SIZE }}>
                  <em>{description}</em>
                </p>
                <p style={{ fontSize: BODY_FONT_SIZE }}>
                  <strong>
                    {type === 'adversary' ? 'Motives & Tactics' : 'Impulses'}:{' '}
                  </strong>
                  {subDescription}
                </p>
              </div>
              <div
                className={cn(
                  'border-t border-b bg-white p-3',
                  type === 'adversary' && 'border-[#bcab84]',
                  type === 'environment' && 'border-[#aaa8a9]',
                )}
              >
                {type === 'adversary' ? (
                  <>
                    <p style={{ fontSize: STAT_FONT_SIZE }}>
                      <strong>Difficulty: </strong>
                      {difficulty} | <strong>Thresholds: </strong>
                      {thresholds ? formatThresholds(thresholds[0]) : null} /{' '}
                      {thresholds ? formatThresholds(thresholds[1]) : null} |{' '}
                      <strong>HP: </strong>
                      {hp} | <strong>Stress: </strong>
                      {stress}
                    </p>
                    <p
                      className='capitalize'
                      style={{ fontSize: STAT_FONT_SIZE }}
                    >
                      <strong>ATK: </strong>
                      {attack} | <strong>{weapon}: </strong>
                      {distance} | {damageAmount} ({damageType})
                    </p>
                    {experience ? (
                      <>
                        <Separator className='my-2' />
                        <p style={{ fontSize: STAT_FONT_SIZE }}>
                          <strong>Experience:</strong> {experience}
                        </p>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: STAT_FONT_SIZE }}>
                      <strong>Difficulty: </strong>
                      {difficulty}
                    </p>
                    <p
                      className='capitalize'
                      style={{ fontSize: STAT_FONT_SIZE }}
                    >
                      <strong>Potential Adversaries: </strong>
                      {potential || 'any'}
                    </p>
                  </>
                )}
              </div>
              <div className='flex-1 min-h-0'>
                <div
                  className='flex h-full flex-col'
                >
                  <h3
                    className='font-eveleth-clean'
                    style={{ fontSize: FEATURE_HEADING_FONT_SIZE }}
                  >
                    Features
                  </h3>
                  <div
                    ref={viewportRef}
                    className='relative flex-1 min-h-0 overflow-hidden'
                  >
                  <div
                    ref={contentRef}
                    className={cn(
                      'absolute inset-0 overflow-hidden',
                      FEATURE_CONTAINER_CLASSES,
                    )}
                  >
                    {firstPageBlocks.map((block, index) => (
                      <div
                        key={`page-0-${index}`}
                        data-preview-feature='true'
                        dangerouslySetInnerHTML={{ __html: block }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          {subsequentPages.map((blocks, pageIndex) => (
            <div
              key={`page-${pageIndex + 1}`}
              className='absolute inset-0 flex h-full flex-col space-y-1 p-4'
              style={{ display: activePage === pageIndex + 1 ? 'flex' : 'none' }}
            >
              <div className='flex-1 min-h-0'>
                <div className='flex h-full flex-col'>
                  <h3
                    className='font-eveleth-clean'
                    style={{ fontSize: FEATURE_HEADING_FONT_SIZE }}
                  >
                    Features (Continued)
                  </h3>
                  <div className='relative flex-1 min-h-0 overflow-hidden'>
                    <div
                      className={cn(
                        'absolute inset-0 overflow-hidden',
                        FEATURE_CONTAINER_CLASSES,
                      )}
                    >
                      {blocks.map((block, index) => (
                        <div
                          key={`page-${pageIndex + 1}-${index}`}
                          data-preview-feature='true'
                          dangerouslySetInnerHTML={{ __html: block }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div
            ref={measurementRef}
            aria-hidden='true'
            className='pointer-events-none absolute left-0 top-0 w-full overflow-visible opacity-0'
            style={{ zIndex: -1 }}
          />
          {hasMultiplePages ? (
            <span className='pointer-events-none absolute bottom-2 right-2 rounded-full border border-white/20 bg-black/75 px-2 py-0.5 text-xs font-semibold text-amber-100 shadow'>
              {activePage + 1}/{totalPages}
            </span>
          ) : null}
        </div>
      </div>
      {hasMultiplePages && showControls ? (
        <div className='mt-1 flex w-full items-center justify-center gap-3 px-1'>
          <button
            type='button'
            onClick={goToPrevious}
            disabled={activePage === 0}
            className='flex size-7 items-center justify-center rounded-full border border-slate-700 bg-gradient-to-r from-amber-200 to-amber-300 text-slate-800 shadow-sm transition-all hover:from-amber-300 hover:to-amber-200 disabled:cursor-not-allowed disabled:opacity-50'
            aria-label='Vorherige Seite'
          >
            <ChevronLeft className='size-4' />
          </button>
          <span className='rounded border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-amber-200 shadow'>
            {activePage + 1} / {totalPages}
          </span>
          <button
            type='button'
            onClick={goToNext}
            disabled={activePage === totalPages - 1}
            className='flex size-7 items-center justify-center rounded-full border border-slate-700 bg-gradient-to-r from-amber-200 to-amber-300 text-slate-800 shadow-sm transition-all hover:from-amber-300 hover:to-amber-200 disabled:cursor-not-allowed disabled:opacity-50'
            aria-label='Nächste Seite'
          >
            <ChevronRight className='size-4' />
          </button>
        </div>
      ) : null}
    </div>
  );
});

AdversaryPreviewStatblock.displayName = 'AdversaryPreviewStatblock';
