import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { AdversaryDetails } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type AdversaryPreviewStatblockProps = React.ComponentProps<'div'> & {
  adversary: AdversaryDetails;
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
>(({ className, adversary, ...props }, ref) => {
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
  const [currentPage, setCurrentPage] = React.useState(0);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const measurementRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const featuresSectionRef = React.useRef<HTMLDivElement>(null);
  const firstPageHeightRef = React.useRef<number>(0);
  const featuresSectionHeightRef = React.useRef<number>(0);
  const innerHeightRef = React.useRef<number>(0);

  const computePages = React.useCallback(() => {
    const measurer = measurementRef.current;
    const viewportEl = viewportRef.current;
    const featuresSectionEl = featuresSectionRef.current;
    const innerEl = innerRef.current;
    if (!measurer || !viewportEl || !featuresSectionEl || !innerEl) return;

    firstPageHeightRef.current = viewportEl.clientHeight;
    featuresSectionHeightRef.current = featuresSectionEl.clientHeight;
    innerHeightRef.current = innerEl.clientHeight;

    const firstPageLimit =
      firstPageHeightRef.current || viewportEl.clientHeight || 0;
    const featuresSectionHeight =
      featuresSectionHeightRef.current || featuresSectionEl.clientHeight || 0;
    const innerHeight = innerHeightRef.current || innerEl.clientHeight || 0;
    const additionalPageLimit = Math.max(
      firstPageLimit + Math.max(innerHeight - featuresSectionHeight, 0),
      firstPageLimit,
    );

    if (!firstPageLimit || !additionalPageLimit) return;

    const wrapBlock = (content: string) =>
      `<div data-preview-feature="true">${content}</div>`;
    const nextPages: string[][] = [];
    let currentPageBlocks: string[] = [];
    let currentLimit = firstPageLimit;
    let pageIndex = 0;

    measurer.innerHTML = '';
    measurer.style.height = 'auto';
    measurer.style.width = `${viewportEl.clientWidth}px`;

    featureBlocks.forEach((block) => {
      const wrapped = wrapBlock(block);
      const previousHeight = measurer.scrollHeight;
      measurer.insertAdjacentHTML('beforeend', wrapped);
      const nextHeight = measurer.scrollHeight;
      const fits =
        nextHeight <= currentLimit || currentPageBlocks.length === 0;
      if (fits) {
        currentPageBlocks.push(block);
      } else {
        if (currentPageBlocks.length) {
          nextPages.push(currentPageBlocks);
        }
        pageIndex += 1;
        currentLimit = pageIndex === 0 ? firstPageLimit : additionalPageLimit;
        currentPageBlocks = [block];
        measurer.innerHTML = wrapBlock(block);
      }
    });

    if (currentPageBlocks.length) {
      nextPages.push(currentPageBlocks);
    }

    if (!nextPages.length) {
      nextPages.push([]);
    }

    measurer.innerHTML = '';
    measurer.removeAttribute('style');

    setPages((prev) => (pagesEqual(prev, nextPages) ? prev : nextPages));
    setCurrentPage((prev) => {
      const maxIndex = Math.max(nextPages.length - 1, 0);
      const next = Math.min(prev, maxIndex);
      return next;
    });
  }, [featureBlocks, currentPage]);

  React.useEffect(() => {
    const initialPages = featureBlocks.length ? [featureBlocks] : [[]];
    setPages((prev) => (pagesEqual(prev, initialPages) ? prev : initialPages));
    setCurrentPage(0);
  }, [featureBlocks]);

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

  const hasMultiplePages = pages.length > 1;
  const firstPageBlocks = pages[0] ?? [];
  const subsequentPages = pages.slice(1);
  const goToPrevious = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  const goToNext = () =>
    setCurrentPage((prev) => Math.min(prev + 1, pages.length - 1));

  const formatThresholds = (n: number) => (n === 0 ? 'None' : n);

  const cardClasses = cn(
    'aspect-card w-[300px] overflow-hidden rounded-md border text-black',
    type === 'adversary' && 'border-[#bcab84] bg-[#f4f0e5]',
    type === 'environment' && 'border-[#aaa8a9] bg-[#ededed]',
    className,
  );

  return (
    <div className='flex flex-col items-center gap-3'>
      <div ref={ref} className={cardClasses} {...props}>
        <div className='relative h-full'>
          <div
            ref={innerRef}
            className={cn('h-full', currentPage !== 0 && 'invisible')}
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
                  ref={featuresSectionRef}
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
                    <div
                      ref={measurementRef}
                      className={cn(
                        'pointer-events-none absolute inset-0',
                        FEATURE_CONTAINER_CLASSES,
                      )}
                      style={{ visibility: 'hidden', zIndex: -1 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {subsequentPages.map((blocks, pageIndex) => (
            <div
              key={`page-${pageIndex + 1}`}
              className={cn(
                'absolute inset-0 flex h-full flex-col space-y-1 p-4 transition-opacity duration-150',
                currentPage === pageIndex + 1
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0',
              )}
              aria-hidden={currentPage !== pageIndex + 1}
            >
              <div className='flex-1 min-h-0'>
                <div className='flex h-full flex-col'>
                  <h3
                    className='font-eveleth-clean'
                    style={{ fontSize: FEATURE_HEADING_FONT_SIZE }}
                  >
                    Features (Fortsetzung)
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
          {hasMultiplePages ? (
            <span className='pointer-events-none absolute bottom-2 right-2 rounded-full border border-white/20 bg-black/75 px-2 py-0.5 text-xs font-semibold text-amber-100 shadow'>
              {currentPage + 1}/{pages.length}
            </span>
          ) : null}
        </div>
      </div>
      {hasMultiplePages ? (
        <div className='flex w-full items-center justify-center gap-2'>
          <button
            type='button'
            onClick={goToPrevious}
            disabled={currentPage === 0}
            className='flex size-7 items-center justify-center rounded-full border border-slate-700 bg-gradient-to-r from-amber-200 to-amber-300 text-slate-800 shadow-sm transition-all hover:from-amber-300 hover:to-amber-200 disabled:cursor-not-allowed disabled:opacity-50'
            aria-label='Vorherige Seite'
          >
            <ChevronLeft className='size-4' />
          </button>
          <span className='rounded border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-amber-200 shadow'>
            {currentPage + 1} / {pages.length}
          </span>
          <button
            type='button'
            onClick={goToNext}
            disabled={currentPage === pages.length - 1}
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
