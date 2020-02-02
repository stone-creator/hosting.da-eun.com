/*
 * Copyright (c) 2016-2019 Martin Donath <martin.donath@squidfunk.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import { keys } from "ramda"
import { NEVER, Observable, OperatorFunction, of, pipe } from "rxjs"
import { map, scan, shareReplay, switchMap } from "rxjs/operators"

import { getElement } from "utilities"

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Component names
 */
export type Component =
  | "container"                        /* Container */
  | "header"                           /* Header */
  | "header-title"                     /* Header title */
  | "hero"                             /* Hero */
  | "main"                             /* Main area */
  | "navigation"                       /* Navigation */
  | "search"                           /* Search */
  | "search-query"                     /* Search input */
  | "search-reset"                     /* Search reset */
  | "search-result"                    /* Search results */
  | "tabs"                             /* Tabs */
  | "toc"                              /* Table of contents */

/**
 * Component map
 */
export type ComponentMap = {
  [P in Component]?: HTMLElement
}

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Options
 */
interface Options {
  document$: Observable<Document>      /* Document observable */
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Watch component mapping
 *
 * This function returns an observable that will maintain bindings to the given
 * components in-between document switches and update the document in-place.
 *
 * @param names - Component names
 * @param options - Options
 *
 * @return Component mapping observable
 */
export function watchComponentMap(
  names: Component[], { document$ }: Options
): Observable<ComponentMap> {
  const components$ = document$
    .pipe(

      /* Build component map */
      map(document => names.reduce<ComponentMap>((components, name) => {
        const el = getElement(`[data-md-component=${name}]`, document)
        return {
          ...components,
          ...typeof el !== "undefined" ? { [name]: el } : {}
        }
      }, {})),

      /* Re-compute component map on document switch */
      scan((prev, next) => {
        for (const name of keys(prev)) {
          switch (name) {

            /* Top-level components: update */
            case "header-title":
            case "container":
              if (name in prev && typeof prev[name] !== "undefined") {
                prev[name]!.replaceWith(next[name]!)
                prev[name] = next[name]
              }
              break

            /* All other components: rebind */
            default:
              prev[name] = getElement(`[data-md-component=${name}]`)
          }
        }
        return prev
      })
    )

  /* Return component map as hot observable */
  return components$
    .pipe(
      shareReplay(1)
    )
}

/* ------------------------------------------------------------------------- */

/**
 * Switch to component
 *
 * @template T - Element type
 *
 * @param name - Component name
 *
 * @return Operator function
 */
export function switchComponent<T extends HTMLElement>(
  name: Component
): OperatorFunction<ComponentMap, T> {
  return pipe(
    switchMap(components => {
      return typeof components[name] !== "undefined"
        ? of(components[name] as T)
        : NEVER
    })
  )
}