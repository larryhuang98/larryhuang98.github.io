---
title: "Optimization-Convexity"
date: 2023-06-06
categories: [Optimization, Notes]
---

## General description of optimization
$$
\begin{align}
&minimize_x\ &f_0(x)\\
&\text{subject to }&f_i(x)\leq b_i \text{ , i=1,2,3,...,m}\\
& &h_j(x)=0\text{ , i=1,2,3,...,m}
\end{align}
$$

The optimization problem can be interpreted as minimizing an **objective function** $$f_0(x)$$, with some **inequality constraints** $$f_i(x)$$ and **equality constraints** $$h_j(x)$$. All sets of x that satisfy all the constraints are named **feasible set**. Our goal is to find the **optimal solution** and its corresponding **optimal value** over the feasible set.

## General Approach
### Lagrangian 
### KKT condition

## Convex problems
In optimization, we may encounter obstacles in the form of local minimums that may impede our ability to locate the global minimum. This is a characteristic of non-convex problems. Conversely, in convex problems, any minimum discovered is guaranteed to be the global minimum.

A problem that is a convex problem need to satisfy three conditions:
1. The objective function needs to be a convex function
2. The inequality constraints functions need to be convex functions
3. The equality constraints need to be affine functions

Most problems, at the first glance, are not automatically convex problems. However, there are some tricks to reformulate the problem as equivalent problems, such that the equivalent problem is a convex problem.

For example, the following problem is not convex because the equality constraint is not an affine function(linear function):
$$
\begin{align}
&minimize_x\ &f_0(x)=x_1^2+x_2^2\\
&\text{subject to }&f_i(x)=\frac{x_1}{(x_2^2+1)}\leq 0 \\
& &h_j(x)=(x_1+x_2)^2=0
\end{align}
$$

While we can rewrite the equivalent problem as a convex function
$$
\begin{align}
&minimize_x\ &f_0(x)=x_1^2+x_2^2\\
&\text{subject to }&f_i(x)=\frac{x_1}{(x_2^2+1)}\leq 0 \\
& &h_j(x)=x_1+x_2=0
\end{align}
$$

Convex problem has one very important property: Any locally optimal point of a convex problem is globally optimum.

## Convex functions and convex sets

A function f is convex when the following two criterions are satisfied:
1. domain of f is a convex set
2. $$f(\theta x+(1-\theta)y)\leq\theta f(x)+(1-\theta)f(y)$$, for any x and y in domain of f and $$0\leq\theta\leq1$$
Two quick ways to find whether the function is convex:
1. First-order condition: suppose f is differentiable with convex domain, f is convex if and only if $$f(y)\geq f(x)+\nabla f(x)^T(y-x)$$ holds for all x and y in the domain
2. Second-order condition: For twice differentiable f with convex domain, f is convex is and only if $$\nabla^2f(x)\geq 0$$
A set is convex when the line segment formed by two points in the set is also in the set, which can be represented as $$x\in C;x=\theta x_1+(1-\theta)x_2;x_1\in C; x_2\in C$$ with $$0\leq\theta\leq1$$
 
